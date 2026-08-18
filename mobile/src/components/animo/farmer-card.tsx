import { Lock, Phone } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
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
            Magsasaka
          </AnimoText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailRow}>
        <Phone size={18} color={AnimoColors.blackSecondary} />
        <View style={styles.detailText}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            {farmer.phone}
          </AnimoText>
        </View>
        <Pressable onPress={() => Linking.openURL(`tel:${farmer.phone.replace(/\s/g, '')}`)} hitSlop={8}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
            Tumawag
          </AnimoText>
        </Pressable>
      </View>
    </View>
  );
}

/** Placeholder shown while the farmer has not accepted the request yet. */
export function LockedFarmerCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.lockedTitle}>
          <Lock size={16} color={AnimoColors.blackSecondary} />
          <AnimoText variant="h3" color={AnimoColors.black}>
            Detalye ng Magsasaka
          </AnimoText>
        </View>
        <StatusBadge label="Naka-lock" tone="neutral" />
      </View>

      {['Pangalan', 'Contact'].map((label) => (
        <View key={label} style={styles.detailRow}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.flex}>
            {label}
          </AnimoText>
          <View style={styles.redacted} />
        </View>
      ))}

      <AnimoText variant="caption" color={AnimoColors.muted}>
        Mabubuksan ang buong detalye kapag tinanggap ng magsasaka ang request.
      </AnimoText>
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
    width: 96,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.border,
  },
});
