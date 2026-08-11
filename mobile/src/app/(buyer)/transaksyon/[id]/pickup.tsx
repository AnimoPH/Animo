import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Map,
  MapPin,
  Phone,
  TriangleAlert,
} from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  balanceDue,
  formatPeso,
  getPurchaseRequest,
  progressSteps,
  type InspectionCheck,
} from '@/constants/marketplace';

/**
 * Pickup at Inspeksyon — the scheduled farm visit.
 *
 * The buyer works the checklist on-site, then confirms; the balance is due the
 * same day, which the footer note repeats.
 */
export default function PickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);

  if (!request?.pickup) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Pickup at Inspeksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Wala pang nakaiskedyul na pickup para sa transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { pickup, inspection, farmer } = request;
  const checks = inspection?.checks ?? [];
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Pickup at Inspeksyon" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIcon}>
              <CalendarDays size={20} color="#2563A8" />
            </View>
            <View style={styles.bannerText}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Nakaiskedyul na Pickup
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                Puntahan ang bukid para sa inspeksyon
              </AnimoText>
            </View>
          </View>
          <View style={styles.bannerMeta}>
            <StatusBadge label="Scheduled" tone="info" />
            <AnimoText variant="caption" color={AnimoColors.muted}>
              {pickup.date}
            </AnimoText>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalye ng Iskedyul
            </AnimoText>
            <Pressable hitSlop={8}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                Baguhin
              </AnimoText>
            </Pressable>
          </View>

          <View style={styles.detailRow}>
            <CalendarDays size={18} color={AnimoColors.blackSecondary} />
            <View style={styles.detailText}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {pickup.date}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {pickup.timeWindow}
              </AnimoText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color={AnimoColors.blackSecondary} />
            <View style={styles.detailText}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {pickup.addressLine}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {pickup.addressDetail}
              </AnimoText>
            </View>
          </View>

          <Pressable style={styles.mapRow}>
            <Map size={18} color={AnimoColors.blackSecondary} />
            <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
              Tingnan sa Mapa
            </AnimoText>
            <ChevronRight size={18} color={AnimoColors.muted} />
          </Pressable>
        </View>

        {/* Inspection checklist */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Checklist ng Inspeksyon
            </AnimoText>
            <StatusBadge
              label={`${passedCount} sa ${checks.length}`}
              tone={passedCount === checks.length ? 'success' : 'warning'}
            />
          </View>

          {checks.map((check) => (
            <ChecklistRow key={check.label} check={check} />
          ))}

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              Nakalistang dami
            </AnimoText>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
              {request.quantityKg} kg
            </AnimoText>
          </View>
        </View>

        {/* Farmer contact, condensed */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View style={styles.avatar}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                {farmer.initials}
              </AnimoText>
            </View>
            <View style={styles.detailText}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {farmer.name}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {farmer.phone}
              </AnimoText>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`tel:${farmer.phone.replace(/\s/g, '')}`)}
              hitSlop={8}
              style={styles.callButton}>
              <Phone size={18} color={AnimoColors.green} />
            </Pressable>
          </View>
        </View>

        <ProgressTracker steps={progressSteps(request)} />

        <NoticeBanner tone="warning" icon={<TriangleAlert size={16} color="#B4791A" />}>
          Ihanda ang balanseng {formatPeso(balanceDue(request))}. Ang huling bayad
          ay parehong araw ng pickup.
        </NoticeBanner>
      </ScrollView>

      <View style={styles.footerStack}>
        <AnimoButton
          label="Kumpirmahin ang Inspeksyon"
          onPress={() => router.replace('/(buyer)/transaksyon/pr-inspected')}
        />
        <AnimoButton label="Baguhin ang Iskedyul" variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

function ChecklistRow({ check }: { check: InspectionCheck }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.checkbox, check.passed && styles.checkboxOn]}>
        {check.passed ? <Check size={13} color={AnimoColors.white} strokeWidth={3} /> : null}
      </View>
      <View style={styles.detailText}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {check.label}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {check.detail}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
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
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3EEFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  detailText: {
    flex: 1,
    gap: 1,
  },
  flex: {
    flex: 1,
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: AnimoColors.green,
    borderColor: AnimoColors.green,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
});
