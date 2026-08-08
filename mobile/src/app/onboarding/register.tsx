import { router, useLocalSearchParams } from 'expo-router';
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
import { LabeledInput } from '@/components/animo/labeled-input';
import { OtpVerification, DEMO_OTP } from '@/components/animo/otp-verification';
import { ProfileForm, type ProfileValues, isProfileComplete } from '@/components/animo/profile-form';
import { StepIndicator, type Step } from '@/components/animo/step-indicator';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { getRole, type RoleId } from '@/constants/roles';
import { useOnboarding } from '@/hooks/use-onboarding';

const STEPS: Step[] = [{ label: 'Numero' }, { label: 'OTP' }, { label: 'Profile' }];
const OTP_LENGTH = 6;

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
};

/**
 * Registration wizard: Numero (phone) → OTP → Profile.
 *
 * Frontend only — no SMS is sent. The OTP demo code is `123456`; anything else
 * shows the error state. On completion the user is sent to the Login screen.
 */
export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: RoleId }>();
  const role = getRole(params.role);
  const isFarmer = role?.id === 'magsasaka';
  const { completeRegistration } = useOnboarding();

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [profile, setProfile] = useState<ProfileValues>(emptyProfile);
  const [submitting, setSubmitting] = useState(false);

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
      setStep(1);
      return;
    }

    if (step === 1) {
      // If already errored, this button becomes "request new OTP".
      if (otpError) {
        setOtp('');
        setOtpError(false);
        return;
      }
      if (otp === DEMO_OTP) {
        setStep(2);
      } else {
        setOtpError(true);
      }
      return;
    }

    // Final step — mark registration done (storing the chosen role), then show
    // the login screen so the user signs in with the number they registered.
    setSubmitting(true);
    await completeRegistration(role?.id ?? 'mamimili');
    router.replace('/login');
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
          {step === 0 && <StepNumero phone={phone} onChangePhone={setPhone} />}

          {step === 1 && (
            <OtpVerification
              phone={phone}
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (otpError) setOtpError(false);
              }}
              error={otpError}
              onChangeNumber={() => {
                setOtp('');
                setOtpError(false);
                setStep(0);
              }}
              onResend={() => {
                setOtp('');
                setOtpError(false);
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
          {step > 0 && (
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.terms}>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Step 1 — phone number entry. */
function StepNumero({
  phone,
  onChangePhone,
}: {
  phone: string;
  onChangePhone: (v: string) => void;
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
