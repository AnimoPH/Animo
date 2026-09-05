import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
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
import { OnboardingWalkthroughModal } from '@/components/animo/onboarding-walkthrough-modal';
import SignOutModal from '@/components/signout-modal';
import {
  AnimoColors,
  AnimoRadius,
  AnimoSpacing,
  AnimoType,
} from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';

const SCREEN_PADDING = AnimoSpacing.lg;

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
 * payment methods, top 5 feedback, Language Selector, and User Guide tutorial walkthrough.
 */
export default function BuyerProfileScreen() {
  const { signOut } = useSession();
  const { t, language, setLanguage, isTagalog } = useLanguage();

  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleLogout = async () => {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/login');
  };

  const handleSettingPress = (key: string) => {
    if (key === 'notif') router.push('/(buyer)/notipikasyon' as Href);
    else if (key === 'language') setShowLanguageModal(true);
    else if (key === 'guide') {
      router.push({ pathname: '/(buyer)', params: { startTour: 'true' } });
    }
    else if (key === 'help') setShowHelpModal(true);
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
                <Text style={styles.roleBadgeText}>{t('role.buyer')}</Text>
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
            <Text style={styles.statValue}>4.9 ★</Text>
            <Text style={styles.statLabel}>{t('profile.rating')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang mga review"
            onPress={() => setShowFeedbacksModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>840</Text>
            <Text style={styles.statLabel}>{t('profile.reviews')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang kamakailang transaksyon"
            onPress={() => setShowRecentTxnsModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>62</Text>
            <Text style={styles.statLabel}>{t('profile.transactions')}</Text>
          </Pressable>
        </View>

        {/* SECTION 3 — Impormasyon ng Account */}
        <Text style={styles.sectionLabel}>{t('profile.accountInfo')}</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPersonalInfoModal(true)}
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <View style={styles.accountIcon}>
              <UserRound size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>{t('profile.personalInfo')}</Text>
              <Text style={styles.accountCaption}>
                {t('profile.personalInfoDesc')}
              </Text>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>

        {/* SECTION 4 — Paraan ng Pagbabayad */}
        <Text style={styles.sectionLabel}>{t('profile.paymentMethods')}</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={styles.gcashIcon}>
              <Text style={styles.gcashIconText}>GC</Text>
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>GCash</Text>
              <Text style={styles.paymentCaption}>0917 **** 234</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('profile.default')}</Text>
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
        <Text style={styles.sectionLabel}>{t('profile.settings')}</Text>
        <View style={[styles.card, styles.settingsCard]}>
          {/* Notifications */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('notif')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <Bell size={20} color={AnimoColors.objectHighEmphasis} />
            <Text style={styles.settingLabel}>{t('profile.notifications')}</Text>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* Language Selection */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('language')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <Globe size={20} color={AnimoColors.accentPrimary} />
            <View style={styles.flexSettingLabel}>
              <Text style={styles.settingLabel}>{t('profile.language')}</Text>
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>
                  {isTagalog ? '🇵🇭 Tagalog' : '🌐 English'}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* User Guide & Tutorial */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('guide')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <BookOpen size={20} color={AnimoColors.objectHighEmphasis} />
            <Text style={styles.settingLabel}>{t('profile.userGuide')}</Text>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* Help & FAQ */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('help')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <HelpCircle size={20} color={AnimoColors.objectHighEmphasis} />
            <Text style={styles.settingLabel}>{t('profile.helpFaq')}</Text>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* Terms */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('terms')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <FileText size={20} color={AnimoColors.objectHighEmphasis} />
            <Text style={styles.settingLabel}>{t('profile.terms')}</Text>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* Privacy */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingPress('privacy')}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <ShieldCheck size={20} color={AnimoColors.objectHighEmphasis} />
            <Text style={styles.settingLabel}>{t('profile.privacy')}</Text>
            <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />

          {/* Sign Out */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSignOutModal(true)}
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
            <LogOut size={20} color={AnimoColors.caution} />
            <Text style={styles.signOutLabel}>{t('profile.signOut')}</Text>
          </Pressable>
        </View>

        {/* Sign Out Modal */}
        <SignOutModal
          visible={showSignOutModal}
          onCancel={() => setShowSignOutModal(false)}
          onConfirm={handleLogout}
        />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.langModalCard} edges={['bottom']}>
            <View style={styles.langModalHeader}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                {t('profile.selectLanguage')}
              </AnimoText>
              <Pressable
                onPress={() => setShowLanguageModal(false)}
                hitSlop={10}
                style={styles.closeBtn}>
                <X size={22} color={AnimoColors.textMediumEmphasis} />
              </Pressable>
            </View>

            <View style={styles.langList}>
              <Pressable
                onPress={() => {
                  setLanguage('tl');
                  setShowLanguageModal(false);
                }}
                style={[
                  styles.langOption,
                  language === 'tl' && styles.langOptionActive,
                ]}>
                <View style={styles.langOptionLeft}>
                  <Text style={styles.langFlag}>🇵🇭</Text>
                  <View>
                    <Text style={styles.langOptionTitle}>Tagalog (Filipino)</Text>
                    <Text style={styles.langOptionSubtitle}>Pangunahing wika sa app</Text>
                  </View>
                </View>
                {language === 'tl' ? (
                  <Check size={20} color={AnimoColors.accentPrimary} />
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
                style={[
                  styles.langOption,
                  language === 'en' && styles.langOptionActive,
                ]}>
                <View style={styles.langOptionLeft}>
                  <Text style={styles.langFlag}>🌐</Text>
                  <View>
                    <Text style={styles.langOptionTitle}>English</Text>
                    <Text style={styles.langOptionSubtitle}>Switch interface to English</Text>
                  </View>
                </View>
                {language === 'en' ? (
                  <Check size={20} color={AnimoColors.accentPrimary} />
                ) : null}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Onboarding / Tutorial Walkthrough Modal */}
      <OnboardingWalkthroughModal
        visible={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Full Personal Information Details Modal */}
      <Modal
        visible={showPersonalInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonalInfoModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.black}>
              {t('profile.personalInfo')}
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
                    maria.santos.trader@gmail.com
                  </AnimoText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <MapPin size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Pangunahing Lokasyon / Warehouse
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Brgy. San Jose, Antipolo City, Rizal
                  </AnimoText>
                </View>
              </View>
            </View>

            {/* Trading Profile Card */}
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.modalSectionLabel}>
              Trading Profile
            </AnimoText>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Package size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Kapasidad sa Pagbili
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    5,000 kg - 10,000 kg bawat buwan
                  </AnimoText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <CreditCard size={18} color={AnimoColors.green} />
                <View style={styles.flex}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Pangunahing Paraan ng Bayad
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    GCash & Cash on Pickup
                  </AnimoText>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label={t('common.close')}
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
            <AnimoText variant="h2" color={AnimoColors.black}>
              Rating at Feedback (Top 5)
            </AnimoText>
            <Pressable
              onPress={() => setShowFeedbacksModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.black} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}>
            <View style={styles.ratingSummaryBanner}>
              <View style={styles.ratingBigWrap}>
                <Text style={styles.ratingBigText}>4.9</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={16} color="#F9A825" fill="#F9A825" />
                  ))}
                </View>
              </View>
              <Text style={styles.ratingSubCaption}>
                840 kabuuang review mula sa mga magsasaka sa Antipolo at Rizal
              </Text>
            </View>

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
              label={t('common.close')}
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
            <AnimoText variant="h2" color={AnimoColors.black}>
              Kamakailang Transaksyon (Top 5)
            </AnimoText>
            <Pressable
              onPress={() => setShowRecentTxnsModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.black} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
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
              label={t('common.close')}
              onPress={() => setShowRecentTxnsModal(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Help Modal */}
      <FeedbackModal
        visible={showHelpModal}
        tone="info"
        title="Tulong at Suporta"
        message="Maaari kang makipag-ugnayan sa Tanggapan ng Pagsasaka (LGU Antipolo) o sa ANIMO Support Hotline sa 0917 123 4567 para sa anumang katanungan ukol sa kalakalan."
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
    color: 'rgba(255,255,255,0.85)',
    marginTop: AnimoSpacing.xs,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
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
    marginTop: 2,
  },
  paymentRow: {
    padding: AnimoSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gcashIcon: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.pill,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gcashIconText: {
    ...AnimoType.tag,
    color: '#1565C0',
  },
  cashIcon: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfaceTertiary,
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
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.accentPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.surfaceTertiary,
    marginHorizontal: AnimoSpacing.lg,
  },
  settingRow: {
    padding: AnimoSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    ...AnimoType.body,
    color: AnimoColors.textHighEmphasis,
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  flexSettingLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: AnimoSpacing.sm,
  },
  langBadge: {
    backgroundColor: AnimoColors.greenTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  langBadgeText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: AnimoColors.accentPrimary,
  },
  signOutLabel: {
    ...AnimoType.body,
    color: AnimoColors.caution,
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  langModalCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopLeftRadius: AnimoRadius.lg,
    borderTopRightRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
  },
  langModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: AnimoSpacing.xs,
  },
  closeBtn: {
    padding: 4,
  },
  langList: {
    gap: AnimoSpacing.sm,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: '#FAFAFA',
  },
  langOptionActive: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.greenTint,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  langFlag: {
    fontSize: 24,
  },
  langOptionTitle: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  langOptionSubtitle: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  modalScroll: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  modalSectionLabel: {
    marginTop: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.xs,
  },
  infoCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
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
  pressed: {
    opacity: 0.88,
  },
});
