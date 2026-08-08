import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BrandHeader } from '@/components/animo/brand-header';
import { RoleCard } from '@/components/animo/role-card';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { ROLES, type RoleId } from '@/constants/roles';

/**
 * "Sino ka?" — role selection. The user picks exactly one role, which is fixed
 * after verification. The selected role is passed on to the registration wizard.
 */
export default function RoleScreen() {
  const [selected, setSelected] = useState<RoleId | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    router.push({ pathname: '/onboarding/register', params: { role: selected } });
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
        <AnimoButton label="Magpatuloy" onPress={handleContinue} disabled={!selected} />
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
  },
});
