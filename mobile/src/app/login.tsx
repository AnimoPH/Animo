import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { LabeledInput } from '@/components/animo/labeled-input';
import { OtpVerification } from '@/components/animo/otp-verification';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole } from '@/constants/roles';
import { fetchMyProfile, sendOtp, verifyOtp } from '@/services/auth-service';
import { useSession } from '@/hooks/use-session';

const OTP_LENGTH = 6;

/**
 * Login flow (phone → OTP), backed by real Supabase Auth. `shouldCreateUser`
 * is false here (see `sendOtp`) — an unregistered number surfaces a real
 * "not registered" error instead of silently creating an account.
 */
export default function LoginScreen() {
  const { refresh } = useSession();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpFilled = otp.length === OTP_LENGTH;

  const handlePrimary = async () => {
    if (step === 'phone') {
      setSubmitting(true);
      setPhoneError(undefined);
      try {
        await sendOtp(phone, { isRegistration: false });
        setStep('otp');
      } catch (err) {
        setPhoneError(
          err instanceof Error ? err.message : 'Hindi mahanap ang numerong ito. Mag-register muna.',
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // OTP step.
    if (otpError) {
      setOtp('');
      setOtpError(false);
      setOtpErrorMessage(undefined);
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(phone, otp);
      const profile = await fetchMyProfile();
      await refresh();
      if (profile) {
        router.replace(homeRouteForRole(profile.role));
      } else {
        // Verified but registration was never finished — resume it.
        router.replace('/onboarding/register?resume=1');
      }
    } catch (err) {
      setOtpError(true);
      setOtpErrorMessage(err instanceof Error ? err.message : undefined);
      setSubmitting(false);
    }
  };

  const primaryLabel =
    step === 'phone' ? 'Mag-Login' : otpError ? 'Humiling ng Bagong OTP' : 'Kumpirmahin';
  const primaryDisabled = step === 'phone' ? !phoneValid : !otpError && !otpFilled;
  const primaryVariant = step === 'otp' && otpError ? 'secondary' : 'primary';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'otp' && (
          <View style={styles.headerBar}>
            <Pressable
              onPress={() => {
                setOtp('');
                setOtpError(false);
                setOtpErrorMessage(undefined);
                setStep('phone');
              }}
              hitSlop={12}
              style={styles.backButton}>
              <ChevronLeft size={26} color={AnimoColors.black} />
            </Pressable>
            <AnimoText variant="h1" color={AnimoColors.green} style={styles.headerTitle}>
              OTP
            </AnimoText>
            <View style={styles.backButton} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {step === 'phone' ? (
            <PhoneStep phone={phone} onChangePhone={setPhone} errorMessage={phoneError} />
          ) : (
            <OtpVerification
              phone={phone}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (otpError) {
                  setOtpError(false);
                  setOtpErrorMessage(undefined);
                }
              }}
              error={otpError}
              errorMessage={otpErrorMessage}
              onChangeNumber={() => {
                setOtp('');
                setOtpError(false);
                setOtpErrorMessage(undefined);
                setStep('phone');
              }}
              onResend={() => {
                setOtp('');
                setOtpError(false);
                setOtpErrorMessage(undefined);
                sendOtp(phone, { isRegistration: false }).catch(() => {});
              }}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 'otp' && (
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.centerText}>
              Hindi natanggap ang SMS? Suriin ang signal o humiling ng bagong OTP.
            </AnimoText>
          )}
          <AnimoButton
            label={primaryLabel}
            onPress={handlePrimary}
            disabled={primaryDisabled}
            loading={submitting}
            variant={primaryVariant}
          />
          {step === 'phone' && (
            <View style={styles.registerRow}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Wala pang account?{' '}
              </AnimoText>
              <Pressable onPress={() => router.replace('/onboarding/role')} hitSlop={8}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.link}>
                  Mag-register
                </AnimoText>
              </Pressable>
            </View>
          )}
          {step === 'phone' && (
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.centerText}>
              Sa pagpatuloy, sumasang-ayon kayo sa aming{' '}
              <AnimoText variant="caption" color={AnimoColors.green}>
                Terms of Service
              </AnimoText>{' '}
              at{' '}
              <AnimoText variant="caption" color={AnimoColors.green}>
                Privacy Policy
              </AnimoText>
              .
            </AnimoText>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Login step 1 — brand lockup + phone entry card. */
function PhoneStep({
  phone,
  onChangePhone,
  errorMessage,
}: {
  phone: string;
  onChangePhone: (v: string) => void;
  errorMessage?: string;
}) {
  return (
    <View style={styles.phoneBody}>
      <View style={styles.brand}>
        <View style={styles.logoBadge}>
          <Image
            source={require('@/assets/images/animo/icon-green.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <AnimoText variant="display" color={AnimoColors.green}>
          Animo
        </AnimoText>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AnimoText variant="h3" color={AnimoColors.black}>
            Numero ng Telepono
          </AnimoText>
          <Pressable onPress={() => onChangePhone('')} hitSlop={8}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.green} style={styles.link}>
              Ibang account?
            </AnimoText>
          </Pressable>
        </View>
        <LabeledInput
          placeholder="9XX XXX XXXX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={onChangePhone}
          maxLength={13}
          hint="Padadalhan namin ng OTP sa numerong ito."
          prefix={
            <View style={styles.phonePrefix}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.blackSecondary}>
                PH
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                +63
              </AnimoText>
            </View>
          }
        />
        {errorMessage && (
          <AnimoText variant="body" color={AnimoColors.danger}>
            {errorMessage}
          </AnimoText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
  },
  phoneBody: {
    gap: AnimoSpacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 48,
    height: 48,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: '100%',
    paddingHorizontal: AnimoSpacing.lg,
    backgroundColor: AnimoColors.border,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  centerText: {
    textAlign: 'center',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
