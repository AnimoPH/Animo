import { CircleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { OtpInput } from '@/components/animo/otp-input';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 300;

export type OtpVerificationProps = {
  /** Phone number to show in the copy (e.g. "912 XXX 6789"). */
  phone: string;
  value: string;
  onChange: (value: string) => void;
  /** True while the OTP is in the failed state (red boxes + message). */
  error: boolean;
  /** Message to show in the error banner — the real error from Supabase. */
  errorMessage?: string;
  /** Called when the user taps "Baguhin ang Numero". */
  onChangeNumber: () => void;
  /** Called when the user requests a new code (after the timer runs out). */
  onResend: () => void;
};

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** First and last digit only. The OTP step must not show the full number. */
function maskLocalPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '9••••••••9';
  if (digits.length === 1) return digits;
  return `${digits[0]}${'•'.repeat(digits.length - 2)}${digits[digits.length - 1]}`;
}

/**
 * Shared OTP entry body used by both registration step 2 and the login flow.
 * Owns the resend countdown; the parent owns verify/navigation.
 */
export function OtpVerification({
  phone,
  value,
  onChange,
  error,
  errorMessage,
  onChangeNumber,
  onResend,
}: OtpVerificationProps) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const canResend = secondsLeft <= 0;

  const handleResend = () => {
    onResend();
    setSecondsLeft(RESEND_SECONDS);
  };

  return (
    <View style={styles.body}>
      {/* Intro */}
      <View style={styles.intro}>
        <AnimoText variant="h2" color={AnimoColors.black}>
          {t('login.otpEnter')}
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {t('login.otpSentPrefix')}{' '}
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            +63 {maskLocalPhone(phone)}
          </AnimoText>
          . {t('login.otpSentSuffix')}
        </AnimoText>
        <Pressable onPress={onChangeNumber} hitSlop={8}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.changeNumber}>
            {t('login.changeNumber')}
          </AnimoText>
        </Pressable>
      </View>

      <View style={styles.otpSection}>
        {/* Countdown for resend */}
      <View style={styles.countdown}>
        {canResend ? (
          <>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              {t('login.noOtp')}
            </AnimoText>
            <Pressable onPress={handleResend} hitSlop={8}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.resend}>
                {t('login.resendOtp')}
              </AnimoText>
            </Pressable>
          </>
        ) : (
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {t('login.otpCountdown')}{' '}
            <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
              {formatCountdown(secondsLeft)}
            </AnimoText>
          </AnimoText>
        )}
      </View>

      {/* OTP input */}
      <OtpInput value={value} onChange={onChange} length={OTP_LENGTH} error={error} />
      
      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <CircleAlert size={18} color={AnimoColors.danger} />
          <AnimoText variant="body" color={AnimoColors.danger} style={styles.errorText}>
            {errorMessage ?? t('login.otpWrong')}
          </AnimoText>
        </View>
      )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: AnimoSpacing.xl,
  },
  intro: {
    gap: AnimoSpacing.sm,
  },
  otpSection: {
    gap: AnimoSpacing.sm,
  },
  changeNumber: {
    textDecorationLine: 'underline',
  },
  countdown: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.dangerTint,
  },
  errorText: {
    flex: 1,
  },
  resend: {
    textDecorationLine: 'underline',
  },
});
