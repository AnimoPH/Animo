import { MapPin, Scale, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ListingImage } from '@/components/animo/listing-image';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso, type Listing } from '@/constants/marketplace';

export type ListingCardProps = {
  listing: Listing;
  onPress: () => void;
};

/**
 * Marketplace listing card: photo, Uri ng Palay, Aktwal na timbang, presyo, at lokasyon.
 * Moisture and purity are excluded.
 */
export function ListingCard({ listing, onPress }: ListingCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <ListingImage height={140} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AnimoText variant="h3" color={AnimoColors.black} style={styles.title}>
            {listing.variety}
          </AnimoText>
        </View>

        <View style={styles.priceRow}>
          <AnimoText variant="price" color={AnimoColors.green}>
            {formatPeso(listing.pricePerKg)}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {' '}
            bawat kilo
          </AnimoText>
        </View>

        {listing.estimated && (
          <StatusBadge
            label="Tinantyang Presyo"
            tone="warning"
            icon={<ShieldCheck size={12} color="#B4791A" />}
          />
        )}

        <View style={styles.specs}>
          <SpecInline icon={<Scale size={14} color={AnimoColors.green} />}>
            {listing.availableKg} kg na aktwal na timbang
          </SpecInline>
        </View>

        <SpecInline icon={<MapPin size={14} color={AnimoColors.blackSecondary} />}>
          {listing.municipality}, {listing.province}
        </SpecInline>
      </View>
    </Pressable>
  );
}

function SpecInline({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.specInline}>
      {icon}
      <AnimoText variant="body" color={AnimoColors.blackSecondary}>
        {children}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    overflow: 'hidden',
    backgroundColor: AnimoColors.white,
  },
  pressed: {
    opacity: 0.95,
  },
  body: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.lg,
  },
  specInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
