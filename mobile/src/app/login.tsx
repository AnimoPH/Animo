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
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { DevLoginBar } from '@/components/animo/dev-login-bar';
import { LoginFooterSection } from '@/components/animo/login/login-footer-section';
import { LoginFormSection } from '@/components/animo/login/login-form-section';
import { LoginHeroSection } from '@/components/animo/login/login-hero-section';
import { OtpVerification } from '@/components/animo/otp-verification';
import { AnimoColors, AnimoLoginColors, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole, type RoleId } from '@/constants/roles';
import { fetchMyProfile, sendOtp, signInDevAccount, verifyOtp } from '@/services/auth-service';
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
  const [devRole, setDevRole] = useState<RoleId | null>(null);
  const [devError, setDevError] = useState<string | undefined>();

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

  const handleDevLogin = async (role: RoleId) => {
    setSubmitting(true);
    setDevRole(role);
    setDevError(undefined);
    try {
      const profile = await signInDevAccount(role);
      await refresh();
      router.replace(homeRouteForRole(profile.role));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Dev login failed.';
      setDevError(message);
      setSubmitting(false);
      setDevRole(null);
    }
  };

  const primaryLabel =
    step === 'phone' ? 'Mag-Login' : otpError ? 'Humiling ng Bagong OTP' : 'Kumpirmahin';
  const primaryDisabled = step === 'phone' ? !phoneValid : !otpError && !otpFilled;
  const primaryVariant = step === 'otp' && otpError ? 'secondary' : 'primary';

  return (
    <SafeAreaView
      style={[styles.safeArea, step === 'phone' && styles.safeAreaPhone]}
      edges={['top', 'bottom']}>
      <StatusBar style={step === 'phone' ? 'dark' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        {step === 'phone' ? (
          <ScrollView
            style={styles.phoneStep}
            contentContainerStyle={styles.phoneStepContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <LoginHeroSection />
            <LoginFormSection
              phone={phone}
              onChangePhone={setPhone}
              errorMessage={phoneError}
              onClearAccount={() => setPhone('')}
              primaryLabel={primaryLabel}
              primaryDisabled={primaryDisabled}
              submitting={submitting && devRole === null}
              onPrimary={handlePrimary}
              onRegister={() => router.replace('/onboarding/role')}
              footer={<LoginFooterSection />}
              devSlot={
                __DEV__ ? (
                  <DevLoginBar
                    onSelect={handleDevLogin}
                    submitting={submitting}
                    activeRole={devRole}
                    error={devError}
                  />
                ) : null
              }
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
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
          </ScrollView>
        )}

        {step === 'otp' && (
          <View style={styles.footer}>
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.centerText}>
              Hindi natanggap ang SMS? Suriin ang signal o humiling ng bagong OTP.
            </AnimoText>
            <AnimoButton
              label={primaryLabel}
              onPress={handlePrimary}
              disabled={primaryDisabled || submitting}
              loading={submitting && devRole === null}
              variant={primaryVariant}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  safeAreaPhone: {
    backgroundColor: AnimoLoginColors.pageBackground,
  },
  flex: {
    flex: 1,
  },
  phoneStep: {
    flex: 1,
  },
  phoneStepContent: {
    flexGrow: 1,
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
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  centerText: {
    textAlign: 'center',
  },
});
