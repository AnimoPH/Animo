import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import SignOutModal from '@/components/signout-modal';
import {
  AnimoColors,
  AnimoRadius,
  AnimoSpacing,
  AnimoType,
} from '@/constants/animo';
import { useSession } from '@/hooks/use-session';

const SCREEN_PADDING = AnimoSpacing.lg;

const CARD_SHADOW = {
  shadowColor: AnimoColors.darkBackground,
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

const SETTINGS_ROWS = [
  { icon: Bell, label: 'Notipikasyon', key: 'notif' },
  { icon: HelpCircle, label: 'Tulong at FAQ', key: 'help' },
  { icon: FileText, label: 'Mga Tuntunin at Kundisyon', key: 'terms' },
  { icon: ShieldCheck, label: 'Patakaran sa Privacy', key: 'privacy' },
] as const;

/**
 * Buyer Profile Screen (Mamimili).
 *
 * Adopts the unified hero identity banner, floating stats row, account info,
 * payment methods, and setting card structure matching the farmer module design.
 */
export default function BuyerProfileScreen() {
  const { signOut } = useSession();
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowSignOutModal(false);
    router.replace('/login');
  };

  const handleSettingPress = (key: string) => {
    if (key === 'help') setShowHelpModal(true);
    else if (key === 'terms') setShowTermsModal(true);
    else if (key === 'privacy') setShowTermsModal(true);
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
            <Text style={styles.fullName}>Maria Santos</Text>
            <Text style={styles.location}>Brgy. San Jose, Antipolo, Rizal</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Lock size={12} color={AnimoColors.white} />
                <Text style={styles.roleBadgeText}>Mamimili</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* SECTION 2 — Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>5.0 ★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>15</Text>
            <Text style={styles.statLabel}>Transaksyon</Text>
          </View>
        </View>

        {/* SECTION 3 — Account Information */}
        <Text style={styles.sectionLabel}>Account Information</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPersonalInfoModal(true)}
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <View style={styles.accountIcon}>
              <UserRound size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>Personal na Impormasyon</Text>
              <Text style={styles.accountCaption}>
                Pangalan, Contact, Address, at Paraan ng Bayad
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
              <Text style={styles.paymentCaption}>0917 •••• 567</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <View style={styles.cashIcon}>
              <Banknote size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentCaption}>Personal na bayaran sa pickup</Text>
            </View>
          </View>
        </View>

        {/* SECTION 5 — Mga Setting */}
        <Text style={styles.sectionLabel}>Mga Setting</Text>
        <View style={[styles.card, styles.settingsCard]}>
          {SETTINGS_ROWS.map(({ icon: Icon, label, key }, index) => (
            <View key={label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSettingPress(key)}
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

        {/* Sign Out Modal */}
        <SignOutModal
          visible={showSignOutModal}
          onCancel={() => setShowSignOutModal(false)}
          onConfirm={handleLogout}
        />
      </ScrollView>

      {/* Full Personal Information Details Modal */}
      <Modal
        visible={showPersonalInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonalInfoModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.black}>
              Personal na Impormasyon
            </AnimoText>
            <Pressable
              onPress={() => setShowPersonalInfoModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.black} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}>
            {/* Identity Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <UserRound size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Buong Pangalan
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Maria Santos
                  </AnimoText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Phone size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Numero ng Telepono
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    +63 917 890 1234
                  </AnimoText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Mail size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Email Address
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    maria.santos@email.com
                  </AnimoText>
                </View>
              </View>
            </View>

            {/* Address Details Card */}
            <View style={styles.infoCard}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Address ng Paghahatid
              </AnimoText>

              <View style={styles.infoRow}>
                <MapPin size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Barangay San Jose, Antipolo, Rizal
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Pangunahing address para sa delivery at pickup coordination
                  </AnimoText>
                </View>
              </View>
            </View>

            {/* Payment Method Card */}
            <View style={styles.infoCard}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Paraan ng Pagbabayad
              </AnimoText>

              <View style={styles.infoRow}>
                <CreditCard size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    GCash Wallet
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    0917 •••• 567 (Naka-link at aktibo)
                  </AnimoText>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label="Isara"
              onPress={() => setShowPersonalInfoModal(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Tulong at Suporta Modal */}
      <FeedbackModal
        visible={showHelpModal}
        tone="info"
        title="Tulong at Suporta"
        message="Maaari kang makipag-ugnayan sa Tanggapan ng Pagsasaka (LGU Antipolo) o sa ANIMO Support Hotline sa 0917 123 4567 para sa anumang katanungan."
        confirmLabel="OK"
        onConfirm={() => setShowHelpModal(false)}
      />

      {/* Terms & Privacy Modal */}
      <FeedbackModal
        visible={showTermsModal}
        tone="info"
        title="Patakaran sa Privacy"
        message="Protektado ang iyong datos alinsunod sa Data Privacy Act ng Pilipinas. Ginagamit lamang ang iyong impormasyon para sa opisyal na transaksyon sa agrikultura."
        confirmLabel="Naiintindihan Ko"
        onConfirm={() => setShowTermsModal(false)}
      />
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
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
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
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  modalFooter: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
