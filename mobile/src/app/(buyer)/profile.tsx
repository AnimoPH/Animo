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
  Phone,
  ShieldCheck,
  Sprout,
  Star,
  UserRound,
  Wallet,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import {
  BuyerPreferencesForm,
  buyerPreferencesFormToInput,
  buyerPreferencesToForm,
  EMPTY_BUYER_PREFERENCES_FORM,
  type BuyerPreferencesFormValues,
} from '@/components/animo/buyer-preferences-form';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import { OnboardingWalkthroughModal } from '@/components/animo/onboarding-walkthrough-modal';
import SignOutModal from '@/components/signout-modal';
import {
  AnimoColors,
  AnimoRadius,
  AnimoSpacing,
  AnimoType,
} from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';
import { updateMyBuyerProfile } from '@/services/auth-service';
import {
  fetchMyBuyerPreferences,
  upsertMyBuyerPreferences,
} from '@/services/buyer-preferences-service';
import { fetchTrustProfile, type TrustProfile } from '@/services/farmer-public-profile';
import { fetchBuyerTransactions, fetchCounterpartNames } from '@/services/transaction-service';

const SCREEN_PADDING = AnimoSpacing.lg;
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

  const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
  const [feedbacks, setFeedbacks] = useState<BuyerFeedback[]>([]);
  const [transactions, setTransactions] = useState<BuyerTxnDisplay[]>([]);

  // Modals state
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
  const [showRecentTxnsModal, setShowRecentTxnsModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showProfileSavedModal, setShowProfileSavedModal] = useState(false);

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
        const [trust, txns, ratingsRes] = await Promise.all([
          fetchTrustProfile(account.id),
          fetchBuyerTransactions(),
          supabase
            .from('rating')
            .select('rating_id, score, comment, created_at, transaction_id, rater_id')
            .eq('rated_id', account.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        if (cancelled) return;
        setTrustProfile(trust);

        // Process ratings
        const ratingRows = ratingsRes.data ?? [];
        const raterIds = ratingRows.map((r) => r.rater_id as string).filter(Boolean);
        const counterpartNames = await fetchCounterpartNames(raterIds);

        const mappedFeedbacks: BuyerFeedback[] = ratingRows.map((r) => {
          const date = r.created_at
            ? new Date(r.created_at).toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '';
          const authorName =
            counterpartNames.get(r.rater_id as string) || (isTagalog ? 'Magsasaka' : 'Farmer');
          return {
            id: r.rating_id as string,
            author: authorName,
            rating: Number(r.score) || 5,
            date,
            comment:
              (r.comment as string | null)?.trim() ||
              (isTagalog ? 'Walang nakasaad na komento.' : 'No comment provided.'),
          };
        });
        setFeedbacks(mappedFeedbacks);

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
            status: tx.status === 'Completed' ? (isTagalog ? 'Kumpleto' : 'Completed') : tx.status,
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

  useEffect(() => {
    if (!showBuyerPreferencesModal) return;
    setBuyerPreferencesLoading(true);
    setBuyerPreferencesError(undefined);
    fetchMyBuyerPreferences()
      .then((prefs) => setBuyerPreferences(buyerPreferencesToForm(prefs)))
      .catch(() => setBuyerPreferencesError('Hindi na-load ang kagustuhan sa pagbili.'))
      .finally(() => setBuyerPreferencesLoading(false));
  }, [showBuyerPreferencesModal]);

  const handleSaveBuyerPreferences = async () => {
    setBuyerPreferencesSaving(true);
    setBuyerPreferencesError(undefined);
    try {
      await upsertMyBuyerPreferences(buyerPreferencesFormToInput(buyerPreferences));
      setShowBuyerPreferencesModal(false);
    } catch (err) {
      setBuyerPreferencesError(
        err instanceof Error ? err.message : 'Hindi na-save ang kagustuhan sa pagbili.',
      );
    } finally {
      setBuyerPreferencesSaving(false);
    }
  };

  const handleSaveBuyerProfile = async () => {
    const trimmedName = editFullName.trim();
    const trimmedGcash = editGcashNumber.trim();
    const gcashValid = trimmedGcash.length === 0 || GCASH_NUMBER_PATTERN.test(trimmedGcash);

    if (trimmedName.length < 2) {
      setProfileError(isTagalog ? 'Pakilagay ang buong pangalan.' : 'Please enter your full name.');
      return;
    }
    if (!gcashValid) {
      setProfileError(isTagalog ? '11 digits ang GCash, nagsisimula sa 09.' : 'GCash must be 11 digits starting with 09.');
      return;
    }

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
      setProfileError(err instanceof Error ? err.message : (isTagalog ? 'Hindi na-save ang profile.' : 'Failed to save profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

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
    } else if (key === 'help') setShowHelpModal(true);
    else if (key === 'terms' || key === 'privacy') setShowTermsModal(true);
  };

  const fullName = account?.fullName || 'Mamimili';
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
            <Text style={styles.location}>{t('role.buyer')}</Text>
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
              <Text style={styles.accountCaption}>{t('profile.personalInfoDesc')}</Text>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowBuyerPreferencesModal(true)}
            style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <View style={styles.accountIcon}>
              <Sprout size={20} color={AnimoColors.objectMediumEmphasis} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>
                {isTagalog ? 'Kagustuhan sa Pagbili' : 'Buying Preferences'}
              </Text>
              <Text style={styles.accountCaption}>
                {isTagalog
                  ? 'Uri ng palay, moisture, at karaniwang dami na binibili'
                  : 'Rice variety, moisture, and target purchase volumes'}
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
              <Text style={styles.paymentCaption}>{gcashDisplay}</Text>
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
              <Text style={styles.paymentCaption}>
                {isTagalog ? 'Personal na bayaran sa pickup' : 'In-person payment upon pickup'}
              </Text>
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
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              {t('profile.personalInfo')}
            </AnimoText>
            <Pressable
              onPress={() => setShowPersonalInfoModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.textHighEmphasis} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.infoCard}>
                <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={{ marginBottom: 4 }}>
                  {isTagalog ? 'Account (Read-only)' : 'Account (Read-only)'}
                </AnimoText>
                <View style={styles.readOnlyField}>
                  <Phone size={18} color={AnimoColors.accentPrimary} />
                  <View style={styles.flex}>
                    <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                      {isTagalog ? 'Numero ng Telepono' : 'Phone Number'}
                    </AnimoText>
                    <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                      {account?.phone || '—'}
                    </AnimoText>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.readOnlyField}>
                  <Wallet size={18} color={AnimoColors.accentPrimary} />
                  <View style={styles.flex}>
                    <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                      {isTagalog ? 'Wallet Address' : 'Wallet Address'}
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.textHighEmphasis} numberOfLines={1} ellipsizeMode="middle">
                      {account?.walletAddress ?? (isTagalog ? 'Wala pang wallet' : 'No wallet yet')}
                    </AnimoText>
                  </View>
                </View>
              </View>

              <View style={[styles.infoCard, { marginTop: AnimoSpacing.md }]}>
                <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={{ marginBottom: 8 }}>
                  {isTagalog ? 'Maaaring I-edit' : 'Editable Details'}
                </AnimoText>

                <LabeledInput
                  label={isTagalog ? 'Buong Pangalan' : 'Full Name'}
                  placeholder="Juan Dela Cruz"
                  autoCapitalize="words"
                  value={editFullName}
                  onChangeText={setEditFullName}
                />

                <LabeledInput
                  label="GCash Number"
                  placeholder="09171234567"
                  keyboardType="number-pad"
                  maxLength={11}
                  value={editGcashNumber}
                  onChangeText={(t) => setEditGcashNumber(t.replace(/\D/g, ''))}
                  hint={isTagalog ? '11 digits, nagsisimula sa 09.' : '11 digits starting with 09.'}
                />

                {profileError ? (
                  <AnimoText variant="caption" color={AnimoColors.danger} style={{ marginTop: 4 }}>
                    {profileError}
                  </AnimoText>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <AnimoButton
                label={isTagalog ? 'I-save ang Pagbabago' : 'Save Changes'}
                onPress={handleSaveBuyerProfile}
                loading={profileSaving}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Kagustuhan sa Pagbili (Buying Preferences) Modal */}
      <Modal
        visible={showBuyerPreferencesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBuyerPreferencesModal(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              {isTagalog ? 'Kagustuhan sa Pagbili' : 'Buying Preferences'}
            </AnimoText>
            <Pressable
              onPress={() => setShowBuyerPreferencesModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.textHighEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}>
            {buyerPreferencesLoading ? (
              <AnimoText variant="body" color={AnimoColors.textLowEmphasis}>
                {isTagalog ? 'Ikinakarga...' : 'Loading...'}
              </AnimoText>
            ) : (
              <BuyerPreferencesForm values={buyerPreferences} onChange={setBuyerPreferences} />
            )}
            {buyerPreferencesError ? (
              <AnimoText variant="body" color={AnimoColors.danger}>
                {buyerPreferencesError}
              </AnimoText>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AnimoButton
              label={isTagalog ? 'I-save' : 'Save Preferences'}
              onPress={handleSaveBuyerPreferences}
              loading={buyerPreferencesSaving}
              disabled={buyerPreferencesLoading}
            />
          </View>
        </SafeAreaView>
      </Modal>

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
              onPress={() => setShowFeedbacksModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.textHighEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
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
                  ? `${reviewCount} kabuuang review mula sa mga magsasaka`
                  : `${reviewCount} total reviews from farmers`}
              </Text>
            </View>

            {feedbacks.length === 0 ? (
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
              onPress={() => setShowRecentTxnsModal(false)}
              hitSlop={8}
              style={styles.closeBtn}>
              <X size={22} color={AnimoColors.textHighEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
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
                        {isTagalog ? 'Magsasaka' : 'Farmer'}: {tx.farmer} · {tx.date}
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

      {/* Profile Saved Success Modal */}
      <FeedbackModal
        visible={showProfileSavedModal}
        tone="success"
        title={isTagalog ? 'Na-save ang Profile' : 'Profile Saved'}
        message={
          isTagalog
            ? 'Matagumpay na na-update ang iyong impormasyon.'
            : 'Your profile information has been successfully updated.'
        }
        confirmLabel="OK"
        onConfirm={() => setShowProfileSavedModal(false)}
      />

      {/* Help Modal */}
      <FeedbackModal
        visible={showHelpModal}
        tone="info"
        title={isTagalog ? 'Tulong at Suporta' : 'Help & Support'}
        message={
          isTagalog
            ? 'Maaari kang makipag-ugnayan sa Tanggapan ng Pagsasaka (Municipal Agriculture Office) o sa ANIMO Support Helpdesk para sa anumang katanungan ukol sa kalakalan.'
            : 'You can contact the Municipal Agriculture Office or ANIMO Support Helpdesk for any trading inquiries.'
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
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  infoCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
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
