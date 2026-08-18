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
  Package,
  Phone,
  ShieldCheck,
  Star,
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

const TOP_BUYER_FEEDBACKS = [
  {
    id: 'fb-1',
    author: 'Mang Kanor (Magsasaka mula Teresa)',
    rating: 5,
    date: '2 araw ang nakalipas',
    comment: 'Napakadaling kausap at napapanahon ang pagkuha ng palay. Maayos at mabilis magbayad sa GCash.',
  },
  {
    id: 'fb-2',
    author: 'Tatay Dante (Magsasaka mula Antipolo)',
    rating: 5,
    date: '1 linggo ang nakalipas',
    comment: 'Tapat sa usapan at walang naging problema sa pickup at inspeksyon ng mga sako.',
  },
  {
    id: 'fb-3',
    author: 'Mang Carding (Magsasaka mula Morong)',
    rating: 5,
    date: '2 linggo ang nakalipas',
    comment: 'Mabilis na proseso ng transaksyon. Kumuha ng 500 kg na Inbred palay nang walang delay.',
  },
  {
    id: 'fb-4',
    author: 'Aling Elena (Magsasaka mula Baras)',
    rating: 5,
    date: '3 linggo ang nakalipas',
    comment: 'Maayos makipagtransaksyon at madaling koordinasyon sa telepono para sa oras ng pickup.',
  },
  {
    id: 'fb-5',
    author: 'Mang Ben (Magsasaka mula Tanay)',
    rating: 5,
    date: '1 buwan ang nakalipas',
    comment: 'Suki na mamimili! Maasahan at laging handa sa itinakdang iskedyul sa bukid.',
  },
];

const TOP_BUYER_TRANSACTIONS = [
  {
    id: 'TXN-8821',
    variety: 'Inbred (RC 218)',
    quantity: '300 kg',
    price: '₱6,300.00',
    method: 'GCash',
    farmer: 'Juan Dela Cruz',
    date: 'Ago 15, 2026',
    status: 'Kumpleto',
  },
  {
    id: 'TXN-7419',
    variety: 'Hybrid (SL-8H)',
    quantity: '500 kg',
    price: '₱11,500.00',
    method: 'GCash',
    farmer: 'Tatay Dante',
    date: 'Ago 08, 2026',
    status: 'Kumpleto',
  },
  {
    id: 'TXN-6102',
    variety: 'Dinorado',
    quantity: '250 kg',
    price: '₱6,250.00',
    method: 'Cash',
    farmer: 'Mang Kanor',
    date: 'Hul 28, 2026',
    status: 'Kumpleto',
  },
  {
    id: 'TXN-5940',
    variety: 'Inbred (NSIC Rc160)',
    quantity: '400 kg',
    price: '₱8,800.00',
    method: 'GCash',
    farmer: 'Aling Elena',
    date: 'Hul 15, 2026',
    status: 'Kumpleto',
  },
  {
    id: 'TXN-4211',
    variety: 'Sinandomeng',
    quantity: '350 kg',
    price: '₱7,700.00',
    method: 'Cash',
    farmer: 'Mang Ben',
    date: 'Hun 30, 2026',
    status: 'Kumpleto',
  },
];

/**
 * Buyer Profile Screen (Mamimili).
 *
 * Adopts the unified hero identity banner, floating stats row, account info,
 * payment methods, top 5 feedback and recent transactions modals matching design system.
 */
export default function BuyerProfileScreen() {
  const { signOut } = useSession();
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleLogout = async () => {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/login');
  };

  const handleSettingPress = (key: string) => {
    if (key === 'help') setShowHelpModal(true);
    else if (key === 'terms' || key === 'privacy') setShowTermsModal(true);
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

        {/* SECTION 2 — Stats Row (Interactive) */}
        <View style={styles.statsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang rating at feedback"
            onPress={() => setShowFeedbacksModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>5.0 ★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang mga review"
            onPress={() => setShowFeedbacksModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang kamakailang transaksyon"
            onPress={() => setShowRecentTxnsModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>15</Text>
            <Text style={styles.statLabel}>Transaksyon</Text>
          </Pressable>
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

      {/* Top 5 Feedbacks Modal */}
      <Modal
        visible={showFeedbacksModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedbacksModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              Rating at Feedback (Top 5)
            </AnimoText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Isara ang modal"
              hitSlop={12}
              onPress={() => setShowFeedbacksModal(false)}>
              <X size={24} color={AnimoColors.objectMediumEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {/* Rating Summary Banner */}
            <View style={styles.ratingSummaryBanner}>
              <View style={styles.ratingBigWrap}>
                <Text style={styles.ratingBigText}>5.0</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={16} color="#F9A825" fill="#F9A825" />
                  ))}
                </View>
              </View>
              <Text style={styles.ratingSubCaption}>
                12 kabuuang review mula sa mga rehistradong magsasaka
              </Text>
            </View>

            {/* Feedback List */}
            {TOP_BUYER_FEEDBACKS.map((fb) => (
              <View key={fb.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.feedbackAuthor}>{fb.author}</Text>
                    <Text style={styles.feedbackDate}>{fb.date}</Text>
                  </View>
                  <View style={styles.starsRowSmall}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={13} color="#F9A825" fill="#F9A825" />
                    ))}
                  </View>
                </View>
                <Text style={styles.feedbackComment}>"{fb.comment}"</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label="Isara"
              onPress={() => setShowFeedbacksModal(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Top 5 Recent Transactions Modal */}
      <Modal
        visible={showRecentTxnsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecentTxnsModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              Kamakailang Transaksyon (Top 5)
            </AnimoText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Isara ang modal"
              hitSlop={12}
              onPress={() => setShowRecentTxnsModal(false)}>
              <X size={24} color={AnimoColors.objectMediumEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {TOP_BUYER_TRANSACTIONS.map((tx) => (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.txVariety}>{tx.variety}</Text>
                    <Text style={styles.txSubtitle}>Magsasaka: {tx.farmer} · {tx.date}</Text>
                  </View>
                  <View style={styles.txStatusBadge}>
                    <Text style={styles.txStatusText}>{tx.status}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.txFooterRow}>
                  <View style={styles.txMetaLeft}>
                    <Text style={styles.txRef}>{tx.id}</Text>
                    <Text style={styles.txQuantity}>{tx.quantity}</Text>
                  </View>
                  <Text style={styles.txPrice}>{tx.price}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label="Isara"
              onPress={() => setShowRecentTxnsModal(false)}
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
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  ratingSummaryBanner: {
    backgroundColor: AnimoColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  ratingBigWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  ratingBigText: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: AnimoColors.textHighEmphasis,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starsRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingSubCaption: {
    ...AnimoType.caption,
    color: AnimoColors.textMediumEmphasis,
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  feedbackAuthor: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  feedbackDate: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
  },
  feedbackComment: {
    ...AnimoType.body,
    color: AnimoColors.textMediumEmphasis,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  txCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  txVariety: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  txSubtitle: {
    ...AnimoType.caption,
    color: AnimoColors.textMediumEmphasis,
  },
  txStatusBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  txStatusText: {
    ...AnimoType.tag,
    color: AnimoColors.accentPrimary,
  },
  txFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  txMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  txRef: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
    fontFamily: 'monospace',
  },
  txQuantity: {
    ...AnimoType.body,
    color: AnimoColors.textMediumEmphasis,
  },
  txPrice: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.accentPrimary,
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
