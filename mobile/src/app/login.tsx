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
import { OtpVerification, DEMO_OTP } from '@/components/animo/otp-verification';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole, roleForPhone } from '@/constants/roles';

const OTP_LENGTH = 6;

/**
 * Login flow (phone → OTP). Shown to returning users. Frontend only: the OTP
 * demo code is `123456`. The phone number decides which module you enter —
 * see DEMO_ACCOUNTS (buyer: 917 123 4567, farmer: 917 987 6543).
 */
export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpFilled = otp.length === OTP_LENGTH;

  const handlePrimary = async () => {
    if (step === 'phone') {
      setStep('otp');
      return;
    }
    // OTP step.
    if (otpError) {
      setOtp('');
      setOtpError(false);
      return;
    }
    if (otp === DEMO_OTP) {
      setSubmitting(true);
      const role = roleForPhone(phone.replace(/\D/g, ''));
      router.replace(homeRouteForRole(role));
    } else {
      setOtpError(true);
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
            <PhoneStep phone={phone} onChangePhone={setPhone} />
          ) : (
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
                setStep('phone');
              }}
              onResend={() => {
                setOtp('');
                setOtpError(false);
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
}: {
  phone: string;
  onChangePhone: (v: string) => void;
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
      </View>

      {/* Demo accounts (frontend only) — tap to autofill. */}
      <View style={styles.demoCard}>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          Demo accounts (OTP: {DEMO_OTP})
        </AnimoText>
        <Pressable onPress={() => onChangePhone('9171234567')} hitSlop={6}>
          <AnimoText variant="body" color={AnimoColors.green}>
            Mamimili · 917 123 4567
          </AnimoText>
        </Pressable>
        <Pressable onPress={() => onChangePhone('9179876543')} hitSlop={6}>
          <AnimoText variant="body" color={AnimoColors.green}>
            Magsasaka · 917 987 6543
          </AnimoText>
        </Pressable>
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
  demoCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 6,
    backgroundColor: AnimoColors.surface,
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
