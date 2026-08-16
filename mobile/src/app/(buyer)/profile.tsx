import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Globe,
  LogOut,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useSession } from '@/hooks/use-session';

/**
 * Profile Screen for Buyer (Mamimili).
 *
 * Clean layout focusing on Account at Transaksyon and Settings at Suporta.
 * Personal Information opens a full detailed page modal containing buyer details, delivery address, and payment method.
 */
export default function BuyerProfileScreen() {
  const { signOut } = useSession();
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setShowLogoutModal(false);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader title="Profile" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Buyer Identity Card */}
        <View style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <AnimoText variant="h2" color={AnimoColors.green}>
                MS
              </AnimoText>
            </View>
            <View style={styles.identityInfo}>
              <View style={styles.nameRow}>
                <AnimoText variant="h2" color={AnimoColors.black}>
                  Maria Santos
                </AnimoText>
                <StatusBadge label="Verified" tone="success" />
              </View>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Mamimili · +63 917 890 1234
              </AnimoText>
              <View style={styles.locationTag}>
                <MapPin size={14} color={AnimoColors.muted} />
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Antipolo, Rizal
                </AnimoText>
              </View>
            </View>
          </View>
        </View>

        {/* Account at Transaksyon Section */}
        <View style={styles.menuSection}>
          <AnimoText variant="h3" color={AnimoColors.black} style={styles.menuTitle}>
            Account at Transaksyon
          </AnimoText>

          <View style={styles.menuGroup}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPersonalInfoModal(true)}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
              <User size={20} color={AnimoColors.blackSecondary} />
              <View style={styles.menuTextWrap}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  Personal na Impormasyon
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Pangalan, Contact, Address, at Paraan ng Bayad
                </AnimoText>
              </View>
              <ChevronRight size={18} color={AnimoColors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Mga Setting at Suporta Section */}
        <View style={styles.menuSection}>
          <AnimoText variant="h3" color={AnimoColors.black} style={styles.menuTitle}>
            Mga Setting at Suporta
          </AnimoText>

          <View style={styles.menuGroup}>
            <MenuRow
              icon={Globe}
              label="Wika / Language"
              value="Tagalog (Filipino)"
            />
            <MenuRow
              icon={CircleHelp}
              label="Tulong at Suporta"
              onPress={() => setShowHelpModal(true)}
            />
            <MenuRow
              icon={FileText}
              label="Patakaran sa Privacy at Terms"
              onPress={() => setShowTermsModal(true)}
            />
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowLogoutModal(true)}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <LogOut size={20} color={AnimoColors.danger} />
          <AnimoText variant="bodyEmphasis" color={AnimoColors.danger}>
            Mag-logout
          </AnimoText>
        </Pressable>
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
                <User size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Buong Pangalan
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Maria Santos
                  </AnimoText>
                </View>
                <StatusBadge label="Verified" tone="success" />
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
                <StatusBadge label="Aktibo" tone="success" />
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

      {/* Logout Confirmation Modal */}
      <FeedbackModal
        visible={showLogoutModal}
        tone="warning"
        title="Mag-logout sa ANIMO?"
        message="Sigurado ka bang nais mong mag-logout sa iyong account?"
        confirmLabel="Oo, Mag-logout"
        onConfirm={handleLogout}
        secondaryLabel="Bumalik"
        onSecondary={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

function MenuRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <Icon size={20} color={AnimoColors.blackSecondary} />
      <View style={styles.menuTextWrap}>
        <AnimoText variant="body" color={AnimoColors.black}>
          {label}
        </AnimoText>
        {value ? (
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {value}
          </AnimoText>
        ) : null}
      </View>
      <ChevronRight size={18} color={AnimoColors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
  },
  identityRow: {
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
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  menuSection: {
    gap: AnimoSpacing.sm,
  },
  menuTitle: {
    paddingHorizontal: 2,
  },
  menuGroup: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.white,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.border,
  },
  menuTextWrap: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    height: 56,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1.5,
    borderColor: AnimoColors.danger,
    marginTop: AnimoSpacing.xs,
    backgroundColor: AnimoColors.white,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
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
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
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
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
  },
  modalFooter: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.white,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.border,
  },
});
