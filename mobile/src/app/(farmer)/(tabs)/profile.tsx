import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Smartphone,
  Star,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { LegalModal } from '@/components/animo/legal-modal';
import { OnboardingWalkthroughModal } from '@/components/animo/onboarding-walkthrough-modal';
import { FARMER_TUTORIAL_KEYS, FARMER_TUTORIAL_STORAGE_KEY } from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog, V2Sheet } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { OptionCard } from '@/components/animo/ui/option-card';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { LegalTabKey } from '@/constants/legal-content';
import { formatPeso } from '@/constants/marketplace';
import { barangayLabel } from '@/constants/profile-options';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { fetchTrustProfile, type TrustProfile } from '@/services/farmer-public-profile';
import { fetchReceivedFeedbacks } from '@/services/received-feedback';
import { fetchCounterpartNames, fetchFarmerTransactions } from '@/services/transaction-service';
import { displayStageForMatch, getDisplayStageLabel } from '@/types/transaction';

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

const HERO_BLOB = { inset: -40, bottom: -70, height: 110, opacity: 0.35 } as const;

/**
 * Farmer Profile and Setting: identity hero, live stats, account, payment methods, and settings.
 * Pulls signed-in account data, user_trust_profile stats, actual ratings, and real transactions.
 */
export default function FarmerProfileScreen() {
  const { account, signOut } = useSession();
  const { t, language, setLanguage, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();

  const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
  const [feedbacks, setFeedbacks] = useState<FarmerFeedback[]>([]);
  const [reviewsUnavailable, setReviewsUnavailable] = useState(false);
  const [transactions, setTransactions] = useState<FarmerTxnDisplay[]>([]);

  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTabKey>('terms');
  const [tutorialEnabled, setTutorialEnabled] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(FARMER_TUTORIAL_STORAGE_KEY).then((seen) => {
        if (active) setTutorialEnabled(seen !== 'true');
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleTutorialToggle = async (on: boolean) => {
    setTutorialEnabled(on);
    try {
      if (on) await AsyncStorage.multiRemove([...FARMER_TUTORIAL_KEYS]);
      else {
        await AsyncStorage.multiSet(FARMER_TUTORIAL_KEYS.map((key) => [key, 'true']));
      }
    } catch {
      setTutorialEnabled(!on);
    }
  };

  const handleSettingPress = (key: string) => {
    if (key === 'notif') router.push('/(farmer)/notipikasyon' as Href);
    else if (key === 'language') setShowLanguageModal(true);
    else if (key === 'guide') {
      router.push({ pathname: '/(farmer)/(tabs)', params: { startTour: 'true' } });
    } else if (key === 'help') {
      setLegalModalTab('faq');
      setShowLegalModal(true);
    } else if (key === 'terms') {
      setLegalModalTab('terms');
      setShowLegalModal(true);
    } else if (key === 'privacy') {
      setLegalModalTab('privacy');
      setShowLegalModal(true);
    }
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
    : t('profileV2.noGcash');

  const hasRating = !!trustProfile && trustProfile.ratingCount > 0;
  const averageRating = hasRating ? trustProfile.averageRating.toFixed(1) : '—';
  const reviewCount = trustProfile ? String(trustProfile.ratingCount) : '0';
  const transactionCount = trustProfile ? String(trustProfile.completedTransactions) : '0';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + AnimoV2Spacing.xl }]}>
          <View style={styles.heroBlob} pointerEvents="none" />
          <Mascot size={84} tile={false} />
          <AnimoText variant="title" color={AnimoV2Colors.textOnBrand} style={styles.centerText} accessibilityRole="header">
            {fullName}
          </AnimoText>
          <View style={styles.locationRow}>
            <MapPin size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={2.5} />
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand} style={styles.centerText}>
              {t('role.farmer')}, {location}
            </AnimoText>
          </View>
        </View>

        <View style={styles.body}>
          {/* Stats (interactive) */}
          <View style={styles.statsRow}>
            <StatTile
              icon={Star}
              filled
              value={averageRating}
              label={t('profileV2.rating')}
              a11y={t('profileV2.a11yRating')}
              onPress={() => setShowFeedbacksModal(true)}
            />
            <StatTile
              icon={MessageSquare}
              value={reviewCount}
              label={t('profile.reviews')}
              a11y={t('profileV2.a11yReviews')}
              onPress={() => setShowFeedbacksModal(true)}
            />
            <StatTile
              icon={Receipt}
              value={transactionCount}
              label={t('profile.transactions')}
              a11y={t('profileV2.a11yTxns')}
              onPress={() => setShowRecentTxnsModal(true)}
            />
          </View>

          {/* Account */}
          <Section title={t('profile.accountInfo')}>
            <SettingRow
              icon={UserRound}
              label={t('profile.personalInfo')}
              caption={t('profile.personalInfoDesc')}
              onPress={() => router.push('/(farmer)/profile-edit' as Href)}
              chevron
            />
            <SettingRow icon={Smartphone} label={t('profileV2.phone')} value={account?.phone ?? '—'} />
          </Section>

          {/* Payment */}
          <Section title={t('profile.paymentMethods')}>
            <SettingRow icon={Banknote} label={t('profileV2.gcash')} value={gcashDisplay} />
            <SettingRow
              icon={Banknote}
              label={t('profileV2.cash')}
              caption={t('profileV2.cashDesc')}
              right={<StatusPill tone="success" label={t('profile.default')} />}
            />
          </Section>

          {/* Settings */}
          <Section title={t('profile.settings')}>
            <SettingRow
              icon={Bell}
              label={t('profile.notifications')}
              onPress={() => handleSettingPress('notif')}
              chevron
            />
            <SettingRow
              icon={Globe}
              label={t('profile.language')}
              value={isTagalog ? 'Tagalog' : 'English'}
              onPress={() => handleSettingPress('language')}
              chevron
            />
            <SettingRow
              icon={BookOpen}
              label={t('profile.userGuide')}
              right={
                <Switch
                  value={tutorialEnabled}
                  onValueChange={handleTutorialToggle}
                  trackColor={{ false: AnimoV2Colors.edgeSoft, true: AnimoV2Colors.brandLight }}
                  thumbColor={tutorialEnabled ? AnimoV2Colors.actionPrimary : AnimoV2Colors.surfaceCard}
                  accessibilityLabel={t('profile.userGuide')}
                />
              }
            />
            <SettingRow
              icon={HelpCircle}
              label={t('profile.helpFaq')}
              onPress={() => handleSettingPress('help')}
              chevron
            />
          </Section>

          {/* Legal */}
          <Section title={t('profileV2.legal')}>
            <SettingRow
              icon={FileText}
              label={t('profile.terms')}
              onPress={() => handleSettingPress('terms')}
              chevron
            />
            <SettingRow
              icon={ShieldCheck}
              label={t('profile.privacy')}
              onPress={() => handleSettingPress('privacy')}
              chevron
            />
          </Section>

          <ChunkyButton
            label={t('profile.signOut')}
            variant="secondary"
            icon={LogOut}
            textColor={AnimoV2Colors.dangerFg}
            borderColor={AnimoV2Colors.dangerSolid}
            onPress={() => setShowSignOutModal(true)}
          />
        </View>
      </ScrollView>

      {/* Sign out dialog */}
      <V2Dialog
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        icon={LogOut}
        iconTone="danger"
        title={t('profileV2.signOutTitle')}
        message={t('profileV2.signOutBody')}
        actions={
          <>
            <ChunkyButton label={t('profile.signOut')} variant="danger" onPress={handleLogout} />
            <ChunkyButton
              label={t('profileV2.stay')}
              variant="secondary"
              onPress={() => setShowSignOutModal(false)}
            />
          </>
        }
      />

      {/* Language sheet */}
      <V2Sheet
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t('profile.selectLanguage')}>
        <OptionCard
          label={t('profile.langTagalog')}
          description={t('profileV2.langTlSub')}
          selected={language === 'tl'}
          onPress={() => {
            setLanguage('tl');
            setShowLanguageModal(false);
          }}
        />
        <OptionCard
          label={t('profile.langEnglish')}
          description={t('profileV2.langEnSub')}
          selected={language === 'en'}
          onPress={() => {
            setLanguage('en');
            setShowLanguageModal(false);
          }}
        />
        <ChunkyButton label={t('profileV2.langDone')} onPress={() => setShowLanguageModal(false)} />
      </V2Sheet>

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
          <ModalHeader title={t('profileV2.ratingsTitle')} closeLabel={t('common.close')} onClose={() => setShowFeedbacksModal(false)} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            <DepthCard depth="flat" radius="lg" backgroundColor={AnimoV2Colors.surfaceBrandSubtle} borderColor={AnimoV2Colors.actionPrimary} style={styles.ratingBanner}>
              <View style={styles.ratingBigRow}>
                <AnimoText variant="display">{hasRating ? trustProfile.averageRating.toFixed(1) : '—'}</AnimoText>
                <StarRow rating={trustProfile ? Math.round(trustProfile.averageRating) : 0} size={20} />
              </View>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('profileV2.reviewsSummary', { count: reviewCount })}
              </AnimoText>
            </DepthCard>

            {reviewsUnavailable ? (
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.emptyText}>
                {t('profileV2.reviewsUnavailable')}
              </AnimoText>
            ) : feedbacks.length === 0 ? (
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.emptyText}>
                {t('profileV2.noReviews')}
              </AnimoText>
            ) : (
              feedbacks.map((fb) => (
                <DepthCard key={fb.id} depth="flat" radius="lg" style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.flex}>
                      <AnimoText variant="bodyStrong">{fb.author}</AnimoText>
                      <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
                        {fb.date}
                      </AnimoText>
                    </View>
                    <StarRow rating={fb.rating} size={16} />
                  </View>
                  <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                    {fb.comment}
                  </AnimoText>
                </DepthCard>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <ChunkyButton label={t('common.close')} onPress={() => setShowFeedbacksModal(false)} />
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
          <ModalHeader title={t('profileV2.recentTxns')} closeLabel={t('common.close')} onClose={() => setShowRecentTxnsModal(false)} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            {transactions.length === 0 ? (
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.emptyText}>
                {t('profileV2.noTxns')}
              </AnimoText>
            ) : (
              transactions.map((tx) => (
                <DepthCard key={tx.id} depth="flat" radius="lg" style={styles.txCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.flex}>
                      <AnimoText variant="bodyStrong">{tx.variety}</AnimoText>
                      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                        {t('profileV2.buyer')}: {tx.buyer} · {tx.date}
                      </AnimoText>
                    </View>
                    <StatusPill tone="neutral" label={tx.status} />
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.txFooter}>
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
                      {tx.id} · {tx.quantity}
                    </AnimoText>
                    <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
                      {tx.price}
                    </AnimoText>
                  </View>
                </DepthCard>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <ChunkyButton label={t('common.close')} onPress={() => setShowRecentTxnsModal(false)} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Legal Terms, Privacy Policy, and FAQ Modal */}
      <LegalModal
        visible={showLegalModal}
        initialTab={legalModalTab}
        onClose={() => setShowLegalModal(false)}
      />
    </View>
  );
}

function StatTile({
  icon: Icon,
  filled = false,
  value,
  label,
  a11y,
  onPress,
}: {
  icon: LucideIcon;
  filled?: boolean;
  value: string;
  label: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <DepthCard
      depth="flat"
      radius="lg"
      onPress={onPress}
      accessibilityLabel={`${a11y}: ${value} ${label}`}
      style={styles.statTile}>
      <Icon
        size={22}
        color={filled ? AnimoV2Colors.warningSolid : AnimoV2Colors.textBrand}
        fill={filled ? AnimoV2Colors.warningSolid : 'none'}
        strokeWidth={2.5}
      />
      <AnimoText variant="heading">{value}</AnimoText>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
        {label}
      </AnimoText>
    </DepthCard>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AnimoText variant="subheading" accessibilityRole="header">
        {title}
      </AnimoText>
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  label,
  caption,
  value,
  right,
  chevron = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  caption?: string;
  value?: string;
  right?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  return (
    <DepthCard
      depth="flat"
      radius="lg"
      onPress={onPress}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={styles.settingRow}>
      <IconTile icon={icon} tone="success" size={36} />
      <View style={styles.flex}>
        <AnimoText variant="bodyStrong">{label}</AnimoText>
        {caption ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {caption}
          </AnimoText>
        ) : null}
      </View>
      {value ? (
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} numberOfLines={1} style={styles.rowValue}>
          {value}
        </AnimoText>
      ) : null}
      {right}
      {chevron ? <ChevronRight size={22} color={AnimoV2Colors.textSecondary} strokeWidth={2.5} /> : null}
    </DepthCard>
  );
}

function StarRow({ rating, size }: { rating: number; size: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityLabel={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= rating ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
          fill={s <= rating ? AnimoV2Colors.warningSolid : 'none'}
          strokeWidth={2.5}
        />
      ))}
    </View>
  );
}

function ModalHeader({ title, closeLabel, onClose }: { title: string; closeLabel: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <AnimoText variant="heading" style={styles.flex} accessibilityRole="header">
        {title}
      </AnimoText>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} onPress={onClose} style={styles.closeBtn}>
        <X size={26} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  scrollContent: { paddingBottom: AnimoV2Spacing.xxl },
  hero: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.xl,
    borderBottomLeftRadius: AnimoV2Radius.xl,
    borderBottomRightRadius: AnimoV2Radius.xl,
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    left: HERO_BLOB.inset,
    right: HERO_BLOB.inset,
    bottom: HERO_BLOB.bottom,
    height: HERO_BLOB.height,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.brandMid,
    opacity: HERO_BLOB.opacity,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  body: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm, alignItems: 'stretch' },
  statTile: { padding: AnimoV2Spacing.md, alignItems: 'center', gap: AnimoV2Spacing.xs },
  section: { gap: AnimoV2Spacing.sm },
  settingRow: {
    minHeight: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  rowValue: { maxWidth: '40%' },
  modalSafeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  closeBtn: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    gap: AnimoV2Spacing.md,
  },
  modalFooter: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  ratingBanner: { padding: AnimoV2Spacing.lg, alignItems: 'center', gap: AnimoV2Spacing.xs },
  ratingBigRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  feedbackCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  txCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  divider: { height: 2, backgroundColor: AnimoV2Colors.borderDefault, borderRadius: 2 },
  emptyText: { textAlign: 'center', paddingVertical: AnimoV2Spacing.xxl },
});
