import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { getPurchaseRequest } from '@/constants/marketplace';

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
 * Suriin ang Magsasaka — Screen 6 in the revised flow.
 *
 * Buyer reviews the farmer with centered overall rating,
 * large detailed star criteria, optional comments, and an anonymous toggle.
 */
export default function ReviewFarmerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);

  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [weightRating, setWeightRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(4);
  const [timelinessRating, setTimelinessRating] = useState(5);

  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Suriin ang Magsasaka" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { farmer } = request;

  const handleSubmit = () => {
    setShowSuccessModal(true);
  };

  const handleSkip = () => {
    router.replace('/(buyer)/transaksyon');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Suriin ang Magsasaka" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Farmer Card */}
          <View style={styles.card}>
            <View style={styles.farmerRow}>
              <View style={styles.avatar}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                  {farmer.initials}
                </AnimoText>
              </View>
              <View style={styles.farmerText}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  {farmer.name}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {farmer.role}
                </AnimoText>
              </View>
            </View>
          </View>

          {/* Overall Rating Card (Centered) */}
          <View style={[styles.card, styles.centerCard]}>
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.textCenter}>
              Ano ang iyong marka?
            </AnimoText>

            <View style={styles.starRowBig}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setOverallRating(star)}
                  hitSlop={8}
                  style={styles.starTouch}>
                  <Star
                    size={38}
                    color={star <= overallRating ? STAR_GOLD : AnimoColors.border}
                    fill={star <= overallRating ? STAR_GOLD : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>

            <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.textCenter}>
              {RATING_MOODS[overallRating]}
            </AnimoText>
          </View>

          {/* Detailed Criteria Card (Large Stars) */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalyadong Marka
            </AnimoText>

            <StarCriterionRow
              label="Kalidad ng palay"
              value={qualityRating}
              onChange={setQualityRating}
            />
            <StarCriterionRow
              label="Tamang timbang"
              value={weightRating}
              onChange={setWeightRating}
            />
            <StarCriterionRow
              label="Komunikasyon"
              value={communicationRating}
              onChange={setCommunicationRating}
            />
            <StarCriterionRow
              label="Pagiging maagap"
              value={timelinessRating}
              onChange={setTimelinessRating}
            />
          </View>

          {/* Comment Card */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Magdagdag ng komento (opsyonal)
            </AnimoText>

            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Ikwento ang iyong karanasan sa magsasaka..."
                placeholderTextColor={AnimoColors.muted}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
              <AnimoText variant="tag" color={AnimoColors.muted} style={styles.counter}>
                {comment.length}/500
              </AnimoText>
            </View>
          </View>

          {/* Anonymous Toggle Card */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  Itago ang aking pangalan
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Ipakikita bilang "Mamimili" sa review
                </AnimoText>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: AnimoColors.border, true: AnimoColors.green }}
                thumbColor={AnimoColors.white}
              />
            </View>
          </View>

          {/* Info Banner */}
          <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
            Makikita ng ibang mamimili ang review na ito sa profile ng magsasaka.
          </NoticeBanner>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerStack}>
          <AnimoButton
            label="Isumite ang Review"
            onPress={handleSubmit}
          />
          <AnimoButton
            label="Laktawan Muna"
            variant="secondary"
            onPress={handleSkip}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Review Submitted Modal */}
      <FeedbackModal
        visible={showSuccessModal}
        tone="success"
        title="Salamat sa Review!"
        message={`Matagumpay na naitala ang iyong marka at komento para kay ${farmer.name}.`}
        confirmLabel="Bumalik sa Transaksyon"
        onConfirm={() => {
          setShowSuccessModal(false);
          router.replace('/(buyer)/transaksyon');
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
      <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.flex}>
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
              color={star <= value ? STAR_GOLD : AnimoColors.border}
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
    backgroundColor: AnimoColors.background,
  },
  flex: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
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
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmerText: {
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
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    marginTop: AnimoSpacing.xs,
    gap: AnimoSpacing.xs,
  },
  textarea: {
    fontSize: 14,
    color: AnimoColors.black,
    minHeight: 90,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
});
