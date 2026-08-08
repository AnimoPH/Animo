import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  LogOut,
  Settings,
  User,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { getRole, type RoleId } from '@/constants/roles';
import { useOnboarding } from '@/hooks/use-onboarding';

export type ProfileScreenProps = {
  /** Role to display; defaults to the stored role. */
  role?: RoleId | null;
};

const MENU = [
  { icon: User, label: 'Personal na Impormasyon' },
  { icon: Bell, label: 'Mga Abiso' },
  { icon: Settings, label: 'Mga Setting' },
  { icon: FileText, label: 'Terms & Privacy' },
  { icon: CircleHelp, label: 'Tulong at Suporta' },
];

/**
 * Shared Profile tab used by both modules. Shows the account role and a menu;
 * logging out clears onboarding state and returns to the landing screen.
 */
export function ProfileScreen({ role }: ProfileScreenProps) {
  const { role: storedRole, reset } = useOnboarding();
  const activeRole = getRole(role ?? storedRole);

  const handleLogout = async () => {
    await reset();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimoText variant="display" color={AnimoColors.black}>
          Profile
        </AnimoText>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <User size={28} color={AnimoColors.green} />
          </View>
          <View style={styles.flex}>
            <AnimoText variant="h2" color={AnimoColors.black}>
              Juan Dela Cruz
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              {activeRole ? activeRole.title : 'Account'} · +63 912 XXX 6789
            </AnimoText>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU.map(({ icon: Icon, label }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Icon size={20} color={AnimoColors.blackSecondary} />
              <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
                {label}
              </AnimoText>
              <ChevronRight size={18} color={AnimoColors.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
          <LogOut size={20} color={AnimoColors.danger} />
          <AnimoText variant="bodyEmphasis" color={AnimoColors.danger}>
            Mag-logout
          </AnimoText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    height: 56,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1.5,
    borderColor: AnimoColors.danger,
  },
});
