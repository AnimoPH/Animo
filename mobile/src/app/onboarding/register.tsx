import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { LabeledInput } from '@/components/animo/labeled-input';
import { OtpVerification } from '@/components/animo/otp-verification';
import { ProfileForm, type ProfileValues, isProfileComplete } from '@/components/animo/profile-form';
import { StepIndicator, type Step } from '@/components/animo/step-indicator';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { getRole, homeRouteForRole, type RoleId } from '@/constants/roles';
import { completeRegistration, sendOtp, verifyOtp } from '@/services/auth-service';
import { useSession } from '@/hooks/use-session';
import type { CompleteRegistrationInput } from '@/types/auth';

const STEPS: Step[] = [{ label: 'Numero' }, { label: 'OTP' }, { label: 'Profile' }];
const OTP_LENGTH = 6;
/** Survives app restarts between OTP verification and profile submission. */
const PENDING_ROLE_KEY = 'animo.registration.pendingRole';

const emptyProfile: ProfileValues = {
  fullName: '',
  age: '',
  gender: null,
  municipality: null,
  barangay: null,
  farmSize: null,
  experience: null,
  household: null,
  stormDamage: null,
  businessName: '',
};

function buildRegistrationInput(role: RoleId, profile: ProfileValues): CompleteRegistrationInput {
  if (role === 'magsasaka') {
    return {
      role,
      fullName: profile.fullName,
      age: profile.age,
      gender: profile.gender!,
      municipality: profile.municipality!,
      barangay: profile.barangay!,
      farmSize: profile.farmSize!,
      experience: profile.experience!,
      household: profile.household!,
      stormDamage: profile.stormDamage!,
    };
  }
  return {
    role,
    fullName: profile.fullName,
    age: profile.age,
    gender: profile.gender!,
    businessName: profile.businessName,
  };
}

/**
 * Registration wizard: Numero (phone) → OTP → Profile, backed by real
 * Supabase Auth phone OTP + the `complete-registration` Edge Function.
 *
 * Resumable: if the app closes between OTP verification and profile submit,
 * `index.tsx` sends the user back here with `?resume=1` — the phone/OTP
 * steps are skipped since the Supabase session already exists, and the
 * chosen role is recovered from `PENDING_ROLE_KEY`.
 */
export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: RoleId; resume?: string }>();
  const isResuming = params.resume === '1';
  const { refresh } = useSession();

  const [roleId, setRoleId] = useState<RoleId | null>(params.role ?? null);
  const role = getRole(roleId ?? undefined);
  const isFarmer = role?.id === 'magsasaka';

  const [step, setStep] = useState(isResuming ? 2 : 0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [profile, setProfile] = useState<ProfileValues>(emptyProfile);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.role) {
      AsyncStorage.setItem(PENDING_ROLE_KEY, params.role);
    } else if (isResuming) {
      AsyncStorage.getItem(PENDING_ROLE_KEY).then((stored) => {
        if (stored) {
          setRoleId(stored as RoleId);
        } else {
          // Lost track of the chosen role — restart cleanly rather than guess.
          router.replace('/onboarding/role');
        }
      });
    }
  }, [params.role, isResuming]);

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpFilled = otp.length === OTP_LENGTH;
  const profileValid = isProfileComplete(profile, isFarmer);

  const goBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  const handlePrimary = async () => {
    if (step === 0) {
      setSubmitting(true);
      setPhoneError(undefined);
      try {
        await sendOtp(phone, { isRegistration: true });
        setStep(1);
      } catch (err) {
        setPhoneError(err instanceof Error ? err.message : 'Hindi mapadala ang OTP.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === 1) {
      // If already errored, this button becomes "request new OTP".
      if (otpError) {
        setOtp('');
        setOtpError(false);
        setOtpErrorMessage(undefined);
        return;
      }
      setSubmitting(true);
      try {
        await verifyOtp(phone, otp);
        setStep(2);
      } catch (err) {
        setOtpError(true);
        setOtpErrorMessage(err instanceof Error ? err.message : undefined);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Final step — create the profile + custodial wallet server-side, then
    // go straight to Home. No second login screen; the session already
    // exists from OTP verification.
    if (!roleId) return;
    setSubmitting(true);
    try {
      await completeRegistration(buildRegistrationInput(roleId, profile));
      await AsyncStorage.removeItem(PENDING_ROLE_KEY);
      await refresh();
      router.replace(homeRouteForRole(roleId));
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Hindi na-save ang profile.');
      setSubmitting(false);
    }
  };

  const primaryLabel =
    step === 0
      ? 'Ipadala ang OTP'
      : step === 1
        ? otpError
          ? 'Humiling ng Bagong OTP'
          : 'Kumpirmahin'
        : 'Tapusin ang Pagre-register';

  const primaryDisabled =
    step === 0 ? !phoneValid : step === 1 ? !otpError && !otpFilled : !profileValid;

  const primaryVariant = step === 1 && otpError ? 'secondary' : 'primary';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header: back + title */}
        <View style={styles.headerBar}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backButton}>
            <ChevronLeft size={26} color={AnimoColors.black} />
          </Pressable>
          <AnimoText variant="h1" color={AnimoColors.green} style={styles.headerTitle}>
            Rehistro
          </AnimoText>
          <View style={styles.backButton} />
        </View>

        <View style={styles.stepIndicatorWrap}>
          <StepIndicator steps={STEPS} current={step} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <StepNumero phone={phone} onChangePhone={setPhone} errorMessage={phoneError} />
          )}

          {step === 1 && (
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
                setStep(0);
              }}
              onResend={() => {
                setOtp('');
                setOtpError(false);
                setOtpErrorMessage(undefined);
                sendOtp(phone, { isRegistration: true }).catch(() => {});
              }}
            />
          )}

          {step === 2 && (
            <ProfileForm
              roleTitle={role?.title}
              showFarmerFields={isFarmer}
              values={profile}
              onChange={setProfile}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 0 && (
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.terms}>
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
          {step > 0 && step < 2 && (
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.terms}>
              Hindi natanggap ang SMS? Suriin ang signal o humiling ng bagong OTP.
            </AnimoText>
          )}
          {step === 2 && phoneError && (
            <AnimoText variant="caption" color={AnimoColors.danger} style={styles.terms}>
              {phoneError}
            </AnimoText>
          )}
          <AnimoButton
            label={primaryLabel}
            onPress={handlePrimary}
            disabled={primaryDisabled}
            loading={submitting}
            variant={primaryVariant}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Step 1 — phone number entry. */
function StepNumero({
  phone,
  onChangePhone,
  errorMessage,
}: {
  phone: string;
  onChangePhone: (v: string) => void;
  errorMessage?: string;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.stepIntro}>
        <AnimoText variant="h2" color={AnimoColors.black}>
          Ilagay ang inyong numero ng telepono
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          Padadalhan namin kayo ng One-Time Password (OTP) sa pamamagitan ng SMS.
        </AnimoText>
      </View>

      <LabeledInput
        label="Numero ng Telepono"
        placeholder="9XX XXX XXXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={onChangePhone}
        maxLength={13}
        hint="10-digit mobile number lamang."
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
    paddingBottom: AnimoSpacing.md,
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
  stepIndicatorWrap: {
    paddingHorizontal: AnimoSpacing.xxl,
    paddingBottom: AnimoSpacing.xl,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
  },
  stepBody: {
    gap: AnimoSpacing.xl,
  },
  stepIntro: {
    gap: AnimoSpacing.sm,
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
  terms: {
    textAlign: 'center',
  },
});
