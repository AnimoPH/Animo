import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { formatPeso } from '@/constants/marketplace';
import { barangayLabel } from '@/constants/profile-options';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { fetchTrustProfile, type TrustProfile } from '@/services/farmer-public-profile';
import { displayStageForMatch, getDisplayStageLabel } from '@/types/transaction';
import { fetchReceivedFeedbacks } from '@/services/received-feedback';
import { fetchCounterpartNames, fetchFarmerTransactions } from '@/services/transaction-service';

const SCREEN_PADDING = AnimoSpacing.lg;

type FarmerFeedback = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
};

type FarmerTxnDisplay = {
  id: string;
  variety: string;
  quantity: string;
  price: string;
  buyer: string;
  date: string;
  status: string;
};

/**
 * Farmer Profile — identity hero, live stats, account, payment methods, and settings.
 * Pulls signed-in account data, user_trust_profile stats, actual ratings, and real transactions.
 */
export default function FarmerProfileScreen() {
  const { account, signOut } = useSession();
  const { t, language, setLanguage, isTagalog } = useLanguage();

  const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
  const [feedbacks, setFeedbacks] = useState<FarmerFeedback[]>([]);
  const [reviewsUnavailable, setReviewsUnavailable] = useState(false);
  const [transactions, setTransactions] = useState<FarmerTxnDisplay[]>([]);

  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;

    const loadProfileData = async () => {
      try {
        const [trust, txns, feedbackResult] = await Promise.all([
          fetchTrustProfile(account.id),
          fetchFarmerTransactions(),
          fetchReceivedFeedbacks(account.id, isTagalog, isTagalog ? 'Mamimili' : 'Buyer')
            .then((rows) => ({ rows, failed: false }))
            .catch(() => ({ rows: [] as FarmerFeedback[], failed: true })),
        ]);

        if (cancelled) return;
        setTrustProfile(trust);
        setReviewsUnavailable(feedbackResult.failed);
        setFeedbacks(feedbackResult.rows);

        // Process top 5 transactions
        const topTxns = txns.slice(0, 5);
        const buyerIds = topTxns.map((tx) => tx.buyerId).filter(Boolean);
        const buyerNames = await fetchCounterpartNames(buyerIds);

        const mappedTxns: FarmerTxnDisplay[] = topTxns.map((tx) => {
          const dateStr = tx.dateCompleted || tx.createdAt;
          const date = dateStr
            ? new Date(dateStr).toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—';
          return {
            id: `TXN-${tx.id.slice(0, 4).toUpperCase()}`,
            variety: 'Palay',
            quantity: `${tx.quantityKg} kg`,
            price: formatPeso(tx.payment?.amount ?? tx.totalAmount),
            buyer: buyerNames.get(tx.buyerId) || (isTagalog ? 'Mamimili' : 'Buyer'),
            date,
            status: getDisplayStageLabel(displayStageForMatch(tx), isTagalog ? 'tl' : 'en'),
          };
        });
        setTransactions(mappedTxns);
      } catch (err) {
        console.warn('[profile] error loading farmer profile stats', err);
      }
    };

    loadProfileData();

    return () => {
      cancelled = true;
    };
  }, [account?.id, isTagalog]);

  const handleLogout = async () => {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/login');
  };

  const handleSettingPress = (key: string) => {
    if (key === 'notif') router.push('/(farmer)/notipikasyon' as Href);
    else if (key === 'language') setShowLanguageModal(true);
    else if (key === 'guide') {
      router.push({ pathname: '/(farmer)/(tabs)', params: { startTour: 'true' } });
    } else if (key === 'help') setShowHelpModal(true);
    else if (key === 'terms' || key === 'privacy') setShowTermsModal(true);
  };

  const fullName = account?.fullName || 'Magsasaka';
  const namedBarangay = barangayLabel(account?.barangay);
  const location = namedBarangay
    ? namedBarangay.startsWith('Brgy.')
      ? `${namedBarangay}, Rizal`
      : `Brgy. ${namedBarangay}, Rizal`
    : 'Rizal';
  const gcashDisplay = account?.gcashNumber
    ? `${account.gcashNumber.slice(0, 4)} **** ${account.gcashNumber.slice(-3)}`
    : isTagalog
      ? 'Wala pang nakatalang GCash'
      : 'No GCash registered';

  const averageRating =
    trustProfile && trustProfile.ratingCount > 0
      ? `${trustProfile.averageRating.toFixed(1)} ★`
      : '— ★';
  const reviewCount = trustProfile ? String(trustProfile.ratingCount) : '0';
  const transactionCount = trustProfile ? String(trustProfile.completedTransactions) : '0';

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
            <Text style={styles.fullName}>{fullName}</Text>
            <Text style={styles.location}>{location}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Lock size={12} color={AnimoColors.white} />
                <Text style={styles.roleBadgeText}>{t('role.farmer')}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* SECTION 2 — Stats Row (Interactive) */}
        <View style={styles.statsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang rating at feedbacks"
            onPress={() => setShowFeedbacksModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>{averageRating}</Text>
            <Text style={styles.statLabel}>{t('profile.rating')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang mga review"
            onPress={() => setShowFeedbacksModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>{reviewCount}</Text>
            <Text style={styles.statLabel}>{t('profile.reviews')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang kamakailang transaksyon"
            onPress={() => setShowRecentTxnsModal(true)}
            style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
            <Text style={styles.statValue}>{transactionCount}</Text>
            <Text style={styles.statLabel}>{t('profile.transactions')}</Text>
          </Pressable>
        </View>

        {/* SECTION 3 — Account Information */}
        <Text style={styles.sectionLabel}>{t('profile.accountInfo')}</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(farmer)/profile-edit' as Href)}
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <View style={styles.accountIcon}>
              <UserRound size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>{t('profile.personalInfo')}</Text>
              <Text style={styles.accountCaption}>{t('profile.personalInfoDesc')}</Text>
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
              <Text style={styles.paymentCaption}>{gcashDisplay}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <View style={styles.cashIcon}>
              <Banknote size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>Cash</Text>
              <Text style={styles.paymentCaption}>
                {isTagalog ? 'Personal na bayaran' : 'In-person payment'}
              </Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>{t('profile.default')}</Text>
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
                <Text style={styles.langBadgeText}>{isTagalog ? 'Tagalog' : 'English'}</Text>
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
                style={[styles.langOption, language === 'tl' && styles.langOptionActive]}>
                <View style={styles.langOptionLeft}>
                  <View>
                    <Text style={styles.langOptionTitle}>Tagalog (Filipino)</Text>
                    <Text style={styles.langOptionSubtitle}>Pangunahing wika sa app</Text>
                  </View>
                </View>
                {language === 'tl' ? <Check size={20} color={AnimoColors.accentPrimary} /> : null}
              </Pressable>

              <Pressable
                onPress={() => {
                  setLanguage('en');
                  setShowLanguageModal(false);
                }}
                style={[styles.langOption, language === 'en' && styles.langOptionActive]}>
                <View style={styles.langOptionLeft}>
                  <View>
                    <Text style={styles.langOptionTitle}>English</Text>
                    <Text style={styles.langOptionSubtitle}>Switch interface to English</Text>
                  </View>
                </View>
                {language === 'en' ? <Check size={20} color={AnimoColors.accentPrimary} /> : null}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Onboarding / Tutorial Walkthrough Modal for Farmers */}
      <OnboardingWalkthroughModal
        visible={showTutorialModal}
        role="magsasaka"
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Feedbacks Modal */}
      <Modal
        visible={showFeedbacksModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedbacksModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              {isTagalog ? 'Rating at Feedback' : 'Ratings & Feedback'}
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
            <View style={styles.ratingSummaryBanner}>
              <View style={styles.ratingBigWrap}>
                <Text style={styles.ratingBigText}>
                  {trustProfile && trustProfile.ratingCount > 0
                    ? trustProfile.averageRating.toFixed(1)
                    : '—'}
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const rounded = trustProfile ? Math.round(trustProfile.averageRating) : 0;
                    return (
                      <Star
                        key={s}
                        size={16}
                        color={s <= rounded ? '#F9A825' : '#D1D5DB'}
                        fill={s <= rounded ? '#F9A825' : 'transparent'}
                      />
                    );
                  })}
                </View>
              </View>
              <Text style={styles.ratingSubCaption}>
                {isTagalog
                  ? `${reviewCount} kabuuang review mula sa mga mamimili`
                  : `${reviewCount} total reviews from buyers`}
              </Text>
            </View>

            {reviewsUnavailable ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {isTagalog ? 'Hindi maipakita ang mga puna ngayon.' : 'Reviews cannot be shown right now.'}
                </Text>
              </View>
            ) : feedbacks.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {isTagalog ? 'Wala pang natatanggap na review.' : 'No reviews received yet.'}
                </Text>
              </View>
            ) : (
              feedbacks.map((fb) => (
                <View key={fb.id} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.feedbackAuthor}>{fb.author}</Text>
                      <Text style={styles.feedbackDate}>{fb.date}</Text>
                    </View>
                    <View style={styles.starsRowSmall}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          color={s <= fb.rating ? '#F9A825' : '#D1D5DB'}
                          fill={s <= fb.rating ? '#F9A825' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.feedbackComment}>"{fb.comment}"</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton label={t('common.close')} onPress={() => setShowFeedbacksModal(false)} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Recent Transactions Modal */}
      <Modal
        visible={showRecentTxnsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecentTxnsModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              {isTagalog ? 'Kamakailang Transaksyon' : 'Recent Transactions'}
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
            {transactions.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {isTagalog
                    ? 'Wala pang natapos na transaksyon.'
                    : 'No completed transactions yet.'}
                </Text>
              </View>
            ) : (
              transactions.map((tx) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.txVariety}>{tx.variety}</Text>
                      <Text style={styles.txSubtitle}>
                        {isTagalog ? 'Mamimili' : 'Buyer'}: {tx.buyer} · {tx.date}
                      </Text>
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
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label={t('common.close')}
              onPress={() => setShowRecentTxnsModal(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Tulong at Suporta Modal */}
      <FeedbackModal
        visible={showHelpModal}
        tone="info"
        title={isTagalog ? 'Tulong at Suporta' : 'Help & Support'}
        message={
          isTagalog
            ? 'Maaari kang makipag-ugnayan sa Tanggapan ng Pagsasaka (Municipal Agriculture Office) o sa ANIMO Support Helpdesk para sa anumang katanungan.'
            : 'You can contact the Municipal Agriculture Office or ANIMO Support Helpdesk for any questions.'
        }
        confirmLabel={isTagalog ? 'OK' : 'Understood'}
        onConfirm={() => setShowHelpModal(false)}
      />

      {/* Terms & Privacy Modal */}
      <FeedbackModal
        visible={showTermsModal}
        tone="info"
        title={isTagalog ? 'Patakaran sa Privacy' : 'Privacy Policy'}
        message={
          isTagalog
            ? 'Protektado ang iyong datos alinsunod sa Data Privacy Act ng Pilipinas. Ginagamit lamang ang iyong impormasyon para sa opisyal na transaksyon sa agrikultura.'
            : 'Your data is protected in accordance with the Data Privacy Act of the Philippines. Your information is strictly used for official agricultural transactions.'
        }
        confirmLabel={isTagalog ? 'Naiintindihan Ko' : 'I Understand'}
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
  emptyWrap: {
    paddingVertical: AnimoSpacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...AnimoType.body,
    color: AnimoColors.textLowEmphasis,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
