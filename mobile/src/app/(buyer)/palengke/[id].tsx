import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Droplet, MapPin, Scale, ShieldCheck, Sprout, TriangleAlert } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { ListingImage } from '@/components/animo/listing-image';
import { ScreenHeader } from '@/components/animo/screen-header';
import { SpecBox } from '@/components/animo/spec-box';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso, getListing } from '@/constants/marketplace';

/** Detalye ng Listing — full detail for one palay listing. */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListing(id);

  if (!listing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Detalye ng Listing" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang listing na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalye ng Listing" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListingImage height={200} borderRadius={AnimoRadius.lg} />

        {/* Summary card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <AnimoText variant="h2" color={AnimoColors.green} style={styles.flex}>
              {listing.variety}
            </AnimoText>
          </View>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {listing.availableKg} kg na available
          </AnimoText>

          {/* Price sub-card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <AnimoText variant="price" color={AnimoColors.green}>
                {formatPeso(listing.pricePerKg)}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                {' '}
                bawat kilo
              </AnimoText>
            </View>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              Nakatakda ang presyo ng sistema — hindi na ito maaaring tawaran.
            </AnimoText>
          </View>

          {listing.estimated && (
            <View style={styles.estimateCard}>
              <View style={styles.estimateHeader}>
                <TriangleAlert size={18} color="#B4791A" />
                <AnimoText variant="bodyEmphasis" color="#B4791A">
                  Tinantyang Presyo
                </AnimoText>
              </View>
              <AnimoText variant="body" color="#8A6A1E">
                Pansamantalang hindi maabot ang live na datos ng presyo. Tinantya ang halaga batay
                sa huling naitalang presyo ng palay.
              </AnimoText>
            </View>
          )}
        </View>

        {/* Quality specs */}
        <View style={styles.section}>
          <AnimoText variant="h2" color={AnimoColors.black}>
            Kalidad na Napatunayan
          </AnimoText>
          <View style={styles.specGrid}>
            <SpecBox
              icon={<Sprout size={14} color={AnimoColors.blackSecondary} />}
              label="Uri ng palay"
              value={listing.variety.replace('Palay ', '')}
            />
            <SpecBox
              icon={<Droplet size={14} color={AnimoColors.blackSecondary} />}
              label="Moisture content"
              value={`${listing.moisturePct.toFixed(1)}%`}
            />
            <SpecBox
              icon={<ShieldCheck size={14} color={AnimoColors.blackSecondary} />}
              label="Purity grade"
              value={listing.purityGrade}
            />
            <SpecBox
              icon={<Scale size={14} color={AnimoColors.blackSecondary} />}
              label="Aktwal na timbang"
              value={`${listing.availableKg} kg`}
            />
          </View>

          <View style={styles.locationRow}>
            <MapPin size={20} color={AnimoColors.green} />
            <View style={styles.flex}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                Bukid sa {listing.municipality}, {listing.province}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                {listing.barangay}, {listing.municipality}
              </AnimoText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimoButton
          label="Mag-bid"
          onPress={() => router.push({ pathname: '/(buyer)/palengke/bid', params: { id: listing.id } })}
        />
      </View>
    </SafeAreaView>
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
    gap: AnimoSpacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  estimateCard: {
    backgroundColor: '#FBF0D9',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 6,
  },
  estimateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  section: {
    gap: AnimoSpacing.md,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
  },
});
