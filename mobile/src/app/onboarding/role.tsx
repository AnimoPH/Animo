import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BrandHeader } from '@/components/animo/brand-header';
import { DevLoginBar } from '@/components/animo/dev-login-bar';
import { RoleCard } from '@/components/animo/role-card';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole, ROLES, type RoleId } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';
import { signInDevAccount } from '@/services/auth-service';

/**
 * "Sino ka?" — role selection. The user picks exactly one role, which is fixed
 * after verification. The selected role is passed on to the registration wizard.
 */
export default function RoleScreen() {
  const { refresh } = useSession();
  const [selected, setSelected] = useState<RoleId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [devRole, setDevRole] = useState<RoleId | null>(null);
  const [devError, setDevError] = useState<string | undefined>();

  const handleContinue = () => {
    if (!selected) return;
    router.push({ pathname: '/onboarding/register', params: { role: selected } });
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <BrandHeader />

        <View style={styles.heading}>
          <AnimoText variant="display" color={AnimoColors.green} style={styles.title}>
            Sino ka?
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.subtitle}>
            Pumili ng isa lamang. Ang inyong papel ay maitatakda pagkatapos ng verification at hindi
            na mababago.
          </AnimoText>
        </View>

        <View style={styles.cards}>
          {ROLES.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              selected={selected === role.id}
              onPress={() => setSelected(role.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimoButton
          label="Magpatuloy"
          onPress={handleContinue}
          disabled={!selected || submitting}
        />
        <DevLoginBar
          onSelect={handleDevLogin}
          submitting={submitting}
          activeRole={devRole}
          error={devError}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.xl,
  },
  heading: {
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  cards: {
    gap: AnimoSpacing.md,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
});
