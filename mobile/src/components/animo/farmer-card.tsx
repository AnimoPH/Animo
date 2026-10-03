import { Phone } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TransactionCounterpart } from '@/types/transaction';

export type FarmerCardProps = {
  farmer: TransactionCounterpart;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Farmer contact details, shown once a transaction match exists — per the
 * "Counterpart contact revealed after a transaction match" RLS policy on
 * "user" (migration 0001), only name/phone are ever available here, no
 * address (this schema has no farm-address column to reveal).
 */
export function FarmerCard({ farmer }: FarmerCardProps) {
  const { isTagalog } = useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
            {initialsOf(farmer.name)}
          </AnimoText>
        </View>
        <View style={styles.headerText}>
          <AnimoText variant="h3" color={AnimoColors.black}>
            {farmer.name}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {isTagalog ? 'Magsasaka' : 'Farmer'}
          </AnimoText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isTagalog ? `Tawagan si ${farmer.name}` : `Call ${farmer.name}`}
          onPress={() => Linking.openURL(`tel:${farmer.phone.replace(/\s/g, '')}`)}
          style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
          <Phone size={14} color={AnimoColors.white} />
          <AnimoText variant="caption" color={AnimoColors.white} style={styles.callBtnText}>
            {isTagalog ? 'Tawagan' : 'Call'}
          </AnimoText>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          Contact Number:
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.phoneValue}>
          {farmer.phone}
        </AnimoText>
      </View>
    </View>
  );
}

/** Placeholder shown while the farmer has not accepted the request yet. */
export function LockedFarmerCard() {
  const { isTagalog } = useLanguage();
  const rows = isTagalog ? ['Pangalan', 'Kontak'] : ['Name', 'Contact'];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AnimoText variant="h3" color={AnimoColors.black} style={styles.flex}>
          {isTagalog ? 'Detalye ng Magsasaka' : 'Farmer Details'}
        </AnimoText>
        <StatusBadge label={isTagalog ? 'Naka-Lock' : 'Locked'} tone="neutral" />
      </View>

      <AnimoText variant="caption" color={AnimoColors.muted}>
        {isTagalog
          ? 'Mabubuksan ang buong detalye kapag tinanggap ng magsasaka ang request.'
          : 'Full details will be unlocked once the farmer accepts the request.'}
      </AnimoText>

      {rows.map((label) => (
        <View key={label} style={styles.redacted} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  lockedTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
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
  redacted: {
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.border,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
  },
  callBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  phoneValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.85,
  },
});
