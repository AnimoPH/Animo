import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Bell,
  BookOpen,
  CheckCircle2,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Smartphone,
  Sprout,
  Star,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import {
  BuyerPreferencesForm,
  buyerPreferencesFormToInput,
  buyerPreferencesToForm,
  EMPTY_BUYER_PREFERENCES_FORM,
  type BuyerPreferencesFormValues,
} from '@/components/animo/buyer-preferences-form';
import { LegalModal } from '@/components/animo/legal-modal';
import { OnboardingWalkthroughModal } from '@/components/animo/onboarding-walkthrough-modal';
import {
  BUYER_TUTORIAL_KEYS,
  TUTORIAL_STORAGE_KEY,
} from '@/components/animo/spotlight-tour';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { V2Dialog, V2Sheet } from '@/components/animo/ui/dialog';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { OptionCard } from '@/components/animo/ui/option-card';
import {
  ModalHeader,
  ProfileRow,
  ProfileSection,
  ProfileStatTile,
  StarRow,
} from '@/components/animo/ui/profile-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { LegalTabKey } from '@/constants/legal-content';
import { getRole } from '@/constants/roles';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { updateMyBuyerProfile } from '@/services/auth-service';
import {
  fetchMyBuyerPreferences,
  upsertMyBuyerPreferences,
} from '@/services/buyer-preferences-service';
import { fetchTrustProfile, type TrustProfile } from '@/services/farmer-public-profile';
import { fetchReceivedFeedbacks } from '@/services/received-feedback';
import { fetchBuyerTransactions, fetchCounterpartNames } from '@/services/transaction-service';
import { getMoistureOptions, getVarietyOptions } from '@/types/crop-listing';
import { displayStageForMatch, getDisplayStageLabel } from '@/types/transaction';

const GCASH_NUMBER_PATTERN = /^09\d{9}$/;

type BuyerFeedback = {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
};

type BuyerTxnDisplay = {
  id: string;
  variety: string;
  quantity: string;
  price: string;
  farmer: string;
  date: string;
  status: string;
};

/**
 * Buyer Profile Screen (Mamimili).
 *
 * Connected to live signed-in account, live trust stats, actual ratings,
 * buyer preferences, and real buyer transactions.
 */
export default function BuyerProfileScreen() {
  const { account, refresh, signOut } = useSession();
  const { t, language, setLanguage, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();

  const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
  const [feedbacks, setFeedbacks] = useState<BuyerFeedback[]>([]);
  const [reviewsUnavailable, setReviewsUnavailable] = useState(false);
  const [transactions, setTransactions] = useState<BuyerTxnDisplay[]>([]);

  // Modals state
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTabKey>('terms');
  const [showProfileSavedModal, setShowProfileSavedModal] = useState(false);
  const [tutorialEnabled, setTutorialEnabled] = useState(false);

  // Edit profile state inside modal
  const [editFullName, setEditFullName] = useState(account?.fullName ?? '');
  const [editGcashNumber, setEditGcashNumber] = useState(account?.gcashNumber ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | undefined>();

  // Buying preferences
  const [showBuyerPreferencesModal, setShowBuyerPreferencesModal] = useState(false);
  const [buyerPreferences, setBuyerPreferences] = useState<BuyerPreferencesFormValues>(
    EMPTY_BUYER_PREFERENCES_FORM,
  );
  const [savedBuyerPreferences, setSavedBuyerPreferences] = useState<BuyerPreferencesFormValues>(
    EMPTY_BUYER_PREFERENCES_FORM,
  );
  const [buyerPreferencesLoading, setBuyerPreferencesLoading] = useState(false);
  const [buyerPreferencesSaving, setBuyerPreferencesSaving] = useState(false);
  const [buyerPreferencesError, setBuyerPreferencesError] = useState<string | undefined>();

  // Sync edit fields when account changes or modal opens
  useEffect(() => {
    if (account) {
      setEditFullName(account.fullName);
      setEditGcashNumber(account.gcashNumber ?? '');
    }
  }, [account, showPersonalInfoModal]);

  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;

    const loadData = async () => {
      try {
        const [trust, txns, feedbackResult] = await Promise.all([
          fetchTrustProfile(account.id),
          fetchBuyerTransactions(),
          fetchReceivedFeedbacks(account.id, isTagalog, isTagalog ? 'Magsasaka' : 'Farmer')
            .then((rows) => ({ rows, failed: false }))
            .catch(() => ({ rows: [] as BuyerFeedback[], failed: true })),
        ]);

        if (cancelled) return;
        setTrustProfile(trust);
        setReviewsUnavailable(feedbackResult.failed);
        setFeedbacks(feedbackResult.rows);

        // Process transactions
        const topTxns = txns.slice(0, 5);
        const farmerIds = topTxns.map((tx) => tx.farmerId).filter(Boolean);
        const farmerNames = await fetchCounterpartNames(farmerIds);

        const mappedTxns: BuyerTxnDisplay[] = topTxns.map((tx) => {
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
            farmer: farmerNames.get(tx.farmerId) || (isTagalog ? 'Magsasaka' : 'Farmer'),
            date,
            status: getDisplayStageLabel(displayStageForMatch(tx), isTagalog ? 'tl' : 'en'),
          };
        });
        setTransactions(mappedTxns);
      } catch (err) {
        console.warn('[buyer-profile] error loading stats', err);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [account?.id, isTagalog]);

  // Saved preferences feed the "Kagustuhan sa Pagbili" summary card.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchMyBuyerPreferences()
        .then((prefs) => {
          if (active) setSavedBuyerPreferences(buyerPreferencesToForm(prefs));
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [showBuyerPreferencesModal]),
  );

  useEffect(() => {
    if (!showBuyerPreferencesModal) return;
    setBuyerPreferencesLoading(true);
    setBuyerPreferencesError(undefined);
    fetchMyBuyerPreferences()
      .then((prefs) => {
        const form = buyerPreferencesToForm(prefs);
        setBuyerPreferences(form);
        setSavedBuyerPreferences(form);
      })
      .catch(() => setBuyerPreferencesError(t('buyProfileV2.prefLoadError')))
      .finally(() => setBuyerPreferencesLoading(false));
    // `t` is intentionally not a dependency: only (re)load when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBuyerPreferencesModal]);

  const quantityText = buyerPreferences.typicalQuantityKg.trim();
  const parsedQuantity = parseFloat(quantityText);
  const quantityValid =
    quantityText.length === 0 || (Number.isFinite(parsedQuantity) && parsedQuantity > 0);
  const preferencesChanged =
    JSON.stringify(buyerPreferencesFormToInput(buyerPreferences)) !==
    JSON.stringify(buyerPreferencesFormToInput(savedBuyerPreferences));
  const canSavePreferences = !buyerPreferencesLoading && quantityValid && preferencesChanged;

  const handleSaveBuyerPreferences = async () => {
    if (!canSavePreferences) return;
    setBuyerPreferencesSaving(true);
    setBuyerPreferencesError(undefined);
    try {
      await upsertMyBuyerPreferences(buyerPreferencesFormToInput(buyerPreferences));
      setShowBuyerPreferencesModal(false);
    } catch (err) {
      setBuyerPreferencesError(
        err instanceof Error ? err.message : t('buyProfileV2.prefSaveError'),
      );
    } finally {
      setBuyerPreferencesSaving(false);
    }
  };

  const trimmedName = editFullName.trim();
  const trimmedGcash = editGcashNumber.trim();
  const gcashValid = trimmedGcash.length === 0 || GCASH_NUMBER_PATTERN.test(trimmedGcash);
  const hasProfileChanges =
    trimmedName !== (account?.fullName ?? '').trim() ||
    trimmedGcash !== (account?.gcashNumber ?? '').trim();
  const canSaveProfile = hasProfileChanges && trimmedName.length >= 2 && gcashValid;

  const handleSaveBuyerProfile = async () => {
    if (!canSaveProfile) return;

    setProfileSaving(true);
    setProfileError(undefined);
    try {
      await updateMyBuyerProfile({
        fullName: trimmedName,
        gcashNumber: trimmedGcash.length > 0 ? trimmedGcash : null,
      });
      await refresh();
      setShowPersonalInfoModal(false);
      setShowProfileSavedModal(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t('profileV2.editFailed'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    setShowSignOutModal(false);
    await signOut();
    router.replace('/login');
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(TUTORIAL_STORAGE_KEY).then((seen) => {
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
      if (on) await AsyncStorage.multiRemove([...BUYER_TUTORIAL_KEYS]);
      else {
        await AsyncStorage.multiSet(BUYER_TUTORIAL_KEYS.map((key) => [key, 'true']));
      }
    } catch {
      setTutorialEnabled(!on);
    }
  };

  const handleSettingPress = (key: string) => {
    if (key === 'notif') router.push('/(buyer)/notipikasyon' as Href);
    else if (key === 'language') setShowLanguageModal(true);
    else if (key === 'guide') {
      router.push({ pathname: '/(buyer)', params: { startTour: 'true' } });
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

  const fullName = account?.fullName || t('role.buyer');
  const gcashDisplay = account?.gcashNumber
    ? `${account.gcashNumber.slice(0, 4)} **** ${account.gcashNumber.slice(-3)}`
    : t('profileV2.noGcash');

  const hasRating = !!trustProfile && trustProfile.ratingCount > 0;
  const averageRating = hasRating ? trustProfile.averageRating.toFixed(1) : '—';
  const reviewCount = trustProfile ? String(trustProfile.ratingCount) : '0';
  const transactionCount = trustProfile ? String(trustProfile.completedTransactions) : '0';

  // Summary chips for the saved buying preferences.
  const varietyChoice = getVarietyOptions(language).find((o) => o.value === savedBuyerPreferences.preferredVariety);
  const moistureChoice = getMoistureOptions(language).find((o) => o.value === savedBuyerPreferences.preferredMoisture);
  const preferenceChips = [
    varietyChoice?.label,
    savedBuyerPreferences.preferredVarietyCode?.trim() || undefined,
    moistureChoice?.label,
    savedBuyerPreferences.typicalQuantityKg.trim()
      ? `${savedBuyerPreferences.typicalQuantityKg.trim()} ${t('buyProfileV2.prefQtyUnit')}`
      : undefined,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + AnimoV2Spacing.lg }]}>
          <Mascot size={84} tile={false} />
          <AnimoText variant="title" color={AnimoV2Colors.textOnBrand} style={styles.centerText} accessibilityRole="header">
            {fullName}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand} style={styles.centerText}>
            {t('role.buyer')}
          </AnimoText>
        </View>

        <View style={styles.body}>
          {/* Stats (interactive) */}
          <View style={styles.statsRow}>
            <ProfileStatTile
              icon={Star}
              filled
              value={averageRating}
              label={t('profileV2.rating')}
              a11y={t('profileV2.a11yRating')}
              onPress={() => setShowFeedbacksModal(true)}
            />
            <ProfileStatTile
              icon={MessageSquare}
              value={reviewCount}
              label={t('profile.reviews')}
              a11y={t('profileV2.a11yReviews')}
              onPress={() => setShowFeedbacksModal(true)}
            />
            <ProfileStatTile
              icon={Receipt}
              value={transactionCount}
              label={t('profile.transactions')}
              a11y={t('profileV2.a11yTxns')}
              onPress={() => setShowRecentTxnsModal(true)}
            />
          </View>

          {/* Account */}
          <ProfileSection title={t('profile.accountInfo')}>
            <ProfileRow
              icon={UserRound}
              label={t('profile.personalInfo')}
              caption={t('profile.personalInfoDesc')}
              onPress={() => setShowPersonalInfoModal(true)}
              chevron
            />
            <ProfileRow icon={Smartphone} label={t('profileV2.phone')} value={account?.phone ?? '—'} />
          </ProfileSection>

          {/* Kagustuhan sa Pagbili */}
          <DepthCard radius="xl" style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <IconTile icon={Sprout} tone="success" size={48} />
              <View style={styles.flex}>
                <AnimoText variant="subheading">{t('buyProfileV2.prefTitle')}</AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('buyProfileV2.prefDesc')}
                </AnimoText>
              </View>
            </View>
            {preferenceChips.length > 0 ? (
              <View style={styles.chipWrap}>
                {preferenceChips.map((chip) => (
                  <View key={chip} style={styles.prefChip}>
                    <AnimoText variant="tagV2" color={AnimoV2Colors.textSecondary}>
                      {chip}
                    </AnimoText>
                  </View>
                ))}
              </View>
            ) : (
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {t('buyProfileV2.prefEmpty')}
              </AnimoText>
            )}
            <ChunkyButton
              size="sm"
              flat
              variant="secondary"
              borderColor={AnimoV2Colors.actionPrimary}
              label={t('buyProfileV2.prefEdit')}
              onPress={() => setShowBuyerPreferencesModal(true)}
              style={styles.stretch}
            />
          </DepthCard>

          {/* Payment */}
          <ProfileSection title={t('profile.paymentMethods')}>
            <ProfileRow icon={Banknote} label={t('profileV2.gcash')} value={gcashDisplay} />
            <ProfileRow
              icon={Banknote}
              label={t('profileV2.cash')}
              caption={t('buyProfileV2.cashDesc')}
              right={<StatusPill tone="success" label={t('profile.default')} />}
            />
          </ProfileSection>

          {/* Settings */}
          <ProfileSection title={t('profile.settings')}>
            <ProfileRow
              icon={Bell}
              label={t('profile.notifications')}
              onPress={() => handleSettingPress('notif')}
              chevron
            />
            <ProfileRow
              icon={Globe}
              label={t('profile.language')}
              value={isTagalog ? 'Tagalog' : 'English'}
              onPress={() => handleSettingPress('language')}
              chevron
            />
            <ProfileRow
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
            <ProfileRow
              icon={HelpCircle}
              label={t('profile.helpFaq')}
              onPress={() => handleSettingPress('help')}
              chevron
            />
          </ProfileSection>

          {/* Legal */}
          <ProfileSection title={t('profileV2.legal')}>
            <ProfileRow
              icon={FileText}
              label={t('profile.terms')}
              onPress={() => handleSettingPress('terms')}
              chevron
            />
            <ProfileRow
              icon={ShieldCheck}
              label={t('profile.privacy')}
              onPress={() => handleSettingPress('privacy')}
              chevron
            />
          </ProfileSection>

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
        message={t('buyProfileV2.signOutBody')}
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

      {/* Onboarding / Tutorial Walkthrough Modal for Buyers */}
      <OnboardingWalkthroughModal
        visible={showTutorialModal}
        role="mamimili"
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Personal Information & Edit Modal */}
      <Modal
        visible={showPersonalInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPersonalInfoModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <ModalHeader
            title={t('profileV2.editTitle')}
            closeLabel={t('common.close')}
            onClose={() => setShowPersonalInfoModal(false)}
          />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <AnimoText variant="subheading">{t('profileV2.editAccount')}</AnimoText>
              <DepthCard depth="flat" radius="lg" style={styles.readOnlyCard}>
                <ReadOnlyRow label={t('buyProfileV2.editNumber')} value={account?.phone || '—'} />
                <View style={styles.divider} />
                <ReadOnlyRow
                  label={t('profileV2.editRole')}
                  value={getRole(account?.role ?? 'mamimili')?.title ?? t('role.buyer')}
                />
                <View style={styles.divider} />
                <ReadOnlyRow
                  label={t('profileV2.editWallet')}
                  value={account?.walletAddress ?? t('profileV2.editNoWallet')}
                />
              </DepthCard>

              <AnimoText variant="subheading">{t('profileV2.editTitle')}</AnimoText>
              <TextField
                label={t('profileV2.editFullName')}
                placeholder="Juan Dela Cruz"
                autoCapitalize="words"
                value={editFullName}
                onChangeText={setEditFullName}
              />
              <TextField
                label={t('buyProfileV2.editGcash')}
                placeholder="09171234567"
                keyboardType="number-pad"
                maxLength={11}
                value={editGcashNumber}
                onChangeText={(text) => setEditGcashNumber(text.replace(/\D/g, ''))}
                error={gcashValid ? undefined : t('profileV2.editGcashHint')}
              />

              {profileError ? (
                <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
                  {profileError}
                </AnimoText>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <ChunkyButton
                label={t('buyProfileV2.save')}
                onPress={handleSaveBuyerProfile}
                disabled={!canSaveProfile}
                loading={profileSaving}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Kagustuhan sa Pagbili (Buying Preferences) edit sheet */}
      <Modal
        visible={showBuyerPreferencesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBuyerPreferencesModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <ModalHeader
            title={t('buyProfileV2.prefTitle')}
            closeLabel={t('common.close')}
            onClose={() => setShowBuyerPreferencesModal(false)}
          />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {buyerPreferencesLoading ? (
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                  {t('buyProfileV2.prefLoading')}
                </AnimoText>
              ) : (
                <BuyerPreferencesForm values={buyerPreferences} onChange={setBuyerPreferences} />
              )}
              {buyerPreferencesError ? (
                <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
                  {buyerPreferencesError}
                </AnimoText>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <ChunkyButton
                label={t('buyProfileV2.prefSave')}
                onPress={handleSaveBuyerPreferences}
                loading={buyerPreferencesSaving}
                disabled={!canSavePreferences}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Feedbacks Modal */}
      <Modal
        visible={showFeedbacksModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedbacksModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <ModalHeader
            title={t('profileV2.ratingsTitle')}
            closeLabel={t('common.close')}
            onClose={() => setShowFeedbacksModal(false)}
          />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            <DepthCard
              depth="flat"
              radius="lg"
              backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
              borderColor={AnimoV2Colors.actionPrimary}
              style={styles.ratingBanner}>
              <View style={styles.ratingBigRow}>
                <AnimoText variant="display">{averageRating}</AnimoText>
                <StarRow rating={trustProfile ? Math.round(trustProfile.averageRating) : 0} size={20} />
              </View>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {t('buyProfileV2.reviewsSummary', { count: reviewCount })}
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
          <ModalHeader
            title={t('profileV2.recentTxns')}
            closeLabel={t('common.close')}
            onClose={() => setShowRecentTxnsModal(false)}
          />

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
                <DepthCard key={tx.id} depth="flat" radius="lg" style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.flex}>
                      <AnimoText variant="bodyStrong">{tx.variety}</AnimoText>
                      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                        {t('buyProfileV2.farmer')}: {tx.farmer} · {tx.date}
                      </AnimoText>
                    </View>
                  </View>
                  <StatusPill tone="neutral" label={tx.status} />
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

      {/* Profile saved dialog */}
      <V2Dialog
        visible={showProfileSavedModal}
        onClose={() => setShowProfileSavedModal(false)}
        icon={CheckCircle2}
        iconTone="success"
        title={t('profileV2.editSavedTitle')}
        message={t('profileV2.editSavedBody')}
        actions={<ChunkyButton label="OK" onPress={() => setShowProfileSavedModal(false)} />}
      />

      {/* Legal Terms, Privacy Policy, and FAQ Modal */}
      <LegalModal
        visible={showLegalModal}
        initialTab={legalModalTab}
        onClose={() => setShowLegalModal(false)}
      />
    </View>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyStrong">{value}</AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
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
  body: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm, alignItems: 'stretch' },
  prefCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  prefHeader: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  prefChip: {
    paddingHorizontal: AnimoV2Spacing.md,
    paddingVertical: 6,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  modalSafeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  modalContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    gap: AnimoV2Spacing.md,
  },
  modalFooter: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  readOnlyCard: { paddingHorizontal: AnimoV2Spacing.lg, paddingVertical: AnimoV2Spacing.sm },
  readOnlyRow: { paddingVertical: AnimoV2Spacing.sm, gap: 2 },
  ratingBanner: { padding: AnimoV2Spacing.lg, alignItems: 'center', gap: AnimoV2Spacing.xs },
  ratingBigRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  feedbackCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  divider: { height: 2, backgroundColor: AnimoV2Colors.borderDefault, borderRadius: 2 },
  emptyText: { textAlign: 'center', paddingVertical: AnimoV2Spacing.xxl },
});
