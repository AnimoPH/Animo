import { CircleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { OtpInput } from '@/components/animo/otp-input';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

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
      <View style={styles.intro}>
        <AnimoText variant="h2" color={AnimoColors.black}>
          Ilagay ang OTP
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          Ipinadala namin ang 6-digit code sa{' '}
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            +63 {phone || '912 XXX 6789'}
          </AnimoText>
          . Pakisuri inbox ng SMS.
        </AnimoText>
        <Pressable onPress={onChangeNumber} hitSlop={8}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.changeNumber}>
            Baguhin ang Numero
          </AnimoText>
        </Pressable>
      </View>

      <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.countdown}>
        {canResend ? (
          'Maaari nang humiling ng bagong OTP.'
        ) : (
          <>
            Makakatanggap ng bagong OTP sa loob ng{' '}
            <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
              {formatCountdown(secondsLeft)}
            </AnimoText>
          </>
        )}
      </AnimoText>

      <OtpInput value={value} onChange={onChange} length={OTP_LENGTH} error={error} />

      {error && (
        <View style={styles.errorBanner}>
          <CircleAlert size={18} color={AnimoColors.danger} />
          <AnimoText variant="body" color={AnimoColors.danger} style={styles.errorText}>
            {errorMessage ?? 'Mali ang OTP. Pakisuring muli o humiling ng bago.'}
          </AnimoText>
        </View>
      )}

      {canResend && (
        <Pressable onPress={handleResend} hitSlop={8}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.resend}>
            Ipadala muli ang code
          </AnimoText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: AnimoSpacing.lg,
  },
  intro: {
    gap: AnimoSpacing.sm,
  },
  changeNumber: {
    textDecorationLine: 'underline',
  },
  countdown: {
    textAlign: 'center',
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
    textAlign: 'center',
  },
});
