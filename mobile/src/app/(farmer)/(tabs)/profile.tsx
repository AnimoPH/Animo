import { router, type Href } from 'expo-router';
import { useSession } from '@/hooks/use-session';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  CheckCircle,
  ChevronRight,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SignOutModal from '@/components/signout-modal';
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from '@/constants/animo';

const SCREEN_PADDING = AnimoSpacing.lg;
const IS_LGU_VERIFIED = true;

const CARD_SHADOW = {
  shadowColor: AnimoColors.darkBackground,
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

const SETTINGS_ROWS = [
  { icon: Bell, label: 'Notipikasyon' },
  { icon: HelpCircle, label: 'Tulong at FAQ' },
  { icon: FileText, label: 'Mga Tuntunin at Kundisyon' },
  { icon: ShieldCheck, label: 'Patakaran sa Privacy' },
] as const;


/**
 * Farmer Profile — identity hero, stats, account, payment methods, and settings.
 * Bottom tabs are provided by `(tabs)/_layout.tsx`.
 */
export default function FarmerProfileScreen() {
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { signOut } = useSession();
  const handleLogout = async () => {
    await signOut();
    setShowSignOutModal(false);
    router.replace('/login');
  };


  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* SECTION 1 — Hero */}
        <View style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroContent}>
            <View style={styles.avatar}>
              <UserRound size={40} color={AnimoColors.accentPrimary} />
            </View>
            <Text style={styles.fullName}>Juan Dela Cruz</Text>
            <Text style={styles.location}>Brgy. San Jose, Antipolo, Rizal</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Lock size={12} color={AnimoColors.white} />
                <Text style={styles.roleBadgeText}>Magsasaka</Text>
              </View>
              {IS_LGU_VERIFIED ? (
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={12} color={AnimoColors.accentPrimary} />
                  <Text style={styles.verifiedBadgeText}>LGU Verified</Text>
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </View>

        {/* SECTION 2 — Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8 ★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>1.2k</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Transaksyon</Text>
          </View>
        </View>

        {/* SECTION 3 — Account Information */}
        <Text style={styles.sectionLabel}>Account Information</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(farmer)/account-information' as Href)}
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <View style={styles.accountIcon}>
              <UserRound size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>Personal na Impormasyon</Text>
              <Text style={styles.accountCaption}>
                Pangalan, Contact, Address, at iba pa.
              </Text>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>

        {/* SECTION 4 — Paraan ng Pagbabayad */}
        <Text style={styles.sectionLabel}>Paraan ng Pagbabayad</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={styles.gcashIcon}>
              <Text style={styles.gcashIconText}>GC</Text>
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>GCash</Text>
              <Text style={styles.paymentCaption}>0912 **** 789</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <View style={styles.cashIcon}>
              <Banknote size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentCaption}>Personal na bayaran</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          </View>
        </View>

        {/* SECTION 5 — Mga Setting */}
        <Text style={styles.sectionLabel}>Mga Setting</Text>
        <View style={[styles.card, styles.settingsCard]}>
          {SETTINGS_ROWS.map(({ icon: Icon, label }, index) => (
            <View key={label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
                <Icon size={20} color={AnimoColors.objectHighEmphasis} />
                <Text style={styles.settingLabel}>{label}</Text>
                <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
              </Pressable>
            </View>
          ))}
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSignOutModal(true)}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <LogOut size={20} color={AnimoColors.caution} />
            <Text style={styles.signOutLabel}>Mag-sign Out</Text>
          </Pressable>
        </View>
        <SignOutModal
          visible={showSignOutModal}
          onCancel={() => setShowSignOutModal(false)}
          onConfirm={handleLogout}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scrollContent: {
    backgroundColor: AnimoColors.appBackground,
  },
  hero: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: AnimoSpacing.xxl,
  },
  heroContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: AnimoSpacing.xl,
  },
  fullName: {
    ...AnimoType.h1,
    color: AnimoColors.white,
    marginTop: AnimoSpacing.md,
    textAlign: 'center',
  },
  location: {
    ...AnimoType.body,
    color: AnimoColors.white,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: AnimoSpacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.sm,
    justifyContent: 'center',
    marginTop: AnimoSpacing.md,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  roleBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.white,
  },
  verifiedBadge: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  verifiedBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.accentPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SCREEN_PADDING,
    marginTop: -AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.md,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  statValue: {
    ...AnimoType.h2,
    color: AnimoColors.accentPrimary,
  },
  statLabel: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
    marginTop: AnimoSpacing.xs,
  },
  sectionLabel: {
    ...AnimoType.h3,
    color: AnimoColors.textHighEmphasis,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.xl,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.sm,
    ...CARD_SHADOW,
  },
  settingsCard: {
    marginBottom: AnimoSpacing.xxl,
  },
  accountRow: {
    padding: AnimoSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  accountTitle: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  accountCaption: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
    marginTop: AnimoSpacing.xs,
  },
  paymentRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gcashIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: AnimoRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcashIconText: {
    ...AnimoType.tag,
    color: AnimoColors.white,
  },
  cashIcon: {
    width: 40,
    height: 40,
    backgroundColor: AnimoColors.surfaceTertiary,
    borderRadius: AnimoRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCopy: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  paymentTitle: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  paymentCaption: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
  },
  defaultBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  defaultBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.accentPrimary,
  },
  settingRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    ...AnimoType.body,
    color: AnimoColors.textHighEmphasis,
    marginLeft: AnimoSpacing.md,
    flex: 1,
  },
  signOutLabel: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.caution,
    marginLeft: AnimoSpacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  pressed: {
    opacity: 0.85,
  },
});
