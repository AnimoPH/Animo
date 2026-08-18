import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Lock, Star, User, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ScreenHeader } from '@/components/animo/screen-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { getFarmerTransaction } from '@/constants/marketplace';

const RATING_MOODS: Record<number, string> = {
  5: 'Napakahusay!',
  4: 'Magaling!',
  3: 'Katamtaman',
  2: 'Kulang pa',
  1: 'Hindi maganda',
  0: 'Pumili ng marka',
};

const STAR_GOLD = '#F5A623';

/**
 * Suriin ang Mamimili — Farmer reviews the buyer.
 * Exact same rating UX, star criteria, comments, and submission flow as the buyer side.
 */
export default function ReviewBuyerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = getFarmerTransaction(id);

  const buyerName = tx?.buyer?.name ?? 'Mateo Santos';

  const [overallRating, setOverallRating] = useState(5);
  const [paymentRating, setPaymentRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(4);
  const [conductRating, setConductRating] = useState(5);

  const [comment, setComment] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = () => {
    setShowSuccessModal(true);
  };

  const handleSkip = () => {
    router.replace('/(farmer)/(tabs)/transaksyon');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Suriin ang Mamimili" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Buyer Card */}
          <View style={styles.card}>
            <View style={styles.buyerRow}>
              <View style={styles.avatar}>
                <User size={22} color={AnimoColors.accentPrimary} />
              </View>
              <View style={styles.buyerText}>
                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
                  {buyerName}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Mamimili · Na-verify na Account
                </AnimoText>
              </View>
            </View>
          </View>

          {/* Overall Rating Card (Centered) */}
          <View style={[styles.card, styles.centerCard]}>
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
              Pangkalahatang Marka
            </AnimoText>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
              {RATING_MOODS[overallRating]}
            </AnimoText>

            {/* Big Star Selector */}
            <View style={styles.starRowBig}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  hitSlop={8}
                  onPress={() => setOverallRating(star)}
                  style={styles.starTouch}>
                  <Star
                    size={36}
                    color={star <= overallRating ? STAR_GOLD : AnimoColors.borderLowEmphasis}
                    fill={star <= overallRating ? STAR_GOLD : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Detailed Criteria Card */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Detalyadong Marka
            </AnimoText>

            <StarCriterionRow
              label="Pagbabayad sa tamang oras"
              value={paymentRating}
              onChange={setPaymentRating}
            />
            <StarCriterionRow
              label="Komunikasyon sa telepono"
              value={communicationRating}
              onChange={setCommunicationRating}
            />
            <StarCriterionRow
              label="Pagsunod sa oras ng pickup"
              value={punctualityRating}
              onChange={setPunctualityRating}
            />
            <StarCriterionRow
              label="Pakikitungo sa transaksyon"
              value={conductRating}
              onChange={setConductRating}
            />
          </View>

          {/* Comment Card */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Magdagdag ng komento (opsyonal)
            </AnimoText>

            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Ikwento ang iyong karanasan sa mamimili..."
                placeholderTextColor={AnimoColors.textLowEmphasis}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
              <AnimoText variant="tag" color={AnimoColors.textLowEmphasis} style={styles.counter}>
                {comment.length}/500
              </AnimoText>
            </View>
          </View>

          {/* Info Banner */}
          <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
            Makikita ng ibang magsasaka ang review na ito sa profile ng mamimili.
          </NoticeBanner>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerStack}>
          <AnimoButton
            label="Isumite ang Review"
            icon={Check}
            onPress={handleSubmit}
          />
          <AnimoButton
            label="Laktawan Muna"
            variant="secondary"
            icon={X}
            onPress={handleSkip}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Review Submitted Modal */}
      <FeedbackModal
        visible={showSuccessModal}
        tone="success"
        title="Salamat sa Review!"
        message={`Matagumpay na naitala ang iyong marka at komento para kay ${buyerName}.`}
        confirmLabel="Bumalik sa Transaksyon"
        onConfirm={() => {
          setShowSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
      />
    </SafeAreaView>
  );
}

function StarCriterionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <View style={styles.criterionRow}>
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.flex}>
        {label}
      </AnimoText>
      <View style={styles.starRowMedium}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={8}
            style={styles.starMediumTouch}>
            <Star
              size={24}
              color={star <= value ? STAR_GOLD : AnimoColors.borderLowEmphasis}
              fill={star <= value ? STAR_GOLD : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  centerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
  },
  textCenter: {
    textAlign: 'center',
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerText: {
    flex: 1,
    gap: 2,
  },
  starRowBig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  starTouch: {
    padding: 3,
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AnimoSpacing.sm,
  },
  starRowMedium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starMediumTouch: {
    padding: 2,
  },
  textareaContainer: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfaceSecondary,
    marginTop: AnimoSpacing.xs,
    gap: AnimoSpacing.xs,
  },
  textarea: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: AnimoColors.textHighEmphasis,
    minHeight: 90,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.appBackground,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
