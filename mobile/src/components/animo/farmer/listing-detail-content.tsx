import {
  CheckCircle,
  Droplets,
  ImageIcon,
  Leaf,
  Scale,
  ShieldCheck,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AnimoText } from "@/components/animo/animo-text";
import { StatusBadge } from "@/components/animo/status-badge";
import { AnimoColors, AnimoRadius, AnimoSpacing } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import {
  STATUS_LABELS,
  moistureLabel,
  purityLabel,
  varietyLabel,
  type CropListing,
} from "@/types/crop-listing";

const STATUS_TONE: Record<CropListing["status"], "success" | "neutral" | "warning"> = {
  Draft: "neutral",
  Available: "success",
  Sold_Out: "neutral",
  Cancelled: "warning",
};

export type ListingDetailContentProps = {
  listing: CropListing;
};

/** "Detalye ng Listing" tab content: hero image, price summary card, quality details card. */
export function ListingDetailContent({ listing }: ListingDetailContentProps) {
  const qualityRows = [
    { Icon: Leaf, label: "Uri ng palay", value: varietyLabel(listing) },
    { Icon: Droplets, label: "Moisture content", value: moistureLabel(listing.declaredMoisture) },
    { Icon: ShieldCheck, label: "Purity grade", value: purityLabel(listing.declaredPurityGrade) },
    { Icon: Scale, label: "Weight", value: `${listing.netWeightKg} kg` },
  ];

  return (
    <>
      <View style={styles.heroImage}>
        <ImageIcon size={40} color={AnimoColors.objectLowEmphasis} />
      </View>

      <View style={[styles.card, styles.shadow]}>
        <View style={styles.summaryTopRow}>
          <View>
            <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
              {varietyLabel(listing)}
            </AnimoText>
            <AnimoText
              variant="caption"
              color={AnimoColors.textLowEmphasis}
              style={styles.summaryQuantity}
            >
              ({listing.remainingQuantityKg} kg)
            </AnimoText>
          </View>
          <StatusBadge
            label={STATUS_LABELS[listing.status]}
            tone={STATUS_TONE[listing.status]}
            icon={<CheckCircle size={12} color={AnimoColors.accentPrimary} />}
          />
        </View>

        <View style={styles.priceBlock}>
          <AnimoText
            variant="caption"
            color={AnimoColors.textHighEmphasisInverse}
            style={styles.priceLabel}
          >
            Patas na Presyo
          </AnimoText>
          <View style={styles.priceRow}>
            <AnimoText
              variant="display"
              color={AnimoColors.textHighEmphasisInverse}
            >
              {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : "—"}
            </AnimoText>
            <AnimoText
              variant="body"
              color={AnimoColors.textHighEmphasisInverse}
              style={styles.priceUnit}
            >
              {" "}
              bawat kilo
            </AnimoText>
          </View>
          <AnimoText
            variant="caption"
            color={AnimoColors.textHighEmphasisInverse}
            style={styles.priceTotal}
          >
            Kabuuan na halaga ({listing.remainingQuantityKg}kg):{" "}
            {listing.pricePerKg !== null
              ? formatPeso(listing.pricePerKg * listing.remainingQuantityKg)
              : "—"}
          </AnimoText>
        </View>
      </View>

      <View style={[styles.card, styles.shadow]}>
        <AnimoText
          variant="h3"
          color={AnimoColors.textHighEmphasis}
          style={styles.qualityHeader}
        >
          Detalye ng Kalidad
        </AnimoText>

        {qualityRows.map((row, index) => (
          <View key={row.label}>
            <View style={styles.qualityRow}>
              <View style={styles.qualityLeft}>
                <row.Icon size={16} color={AnimoColors.objectLowEmphasis} />
                <AnimoText
                  variant="body"
                  color={AnimoColors.textMediumEmphasis}
                  style={styles.qualityLabel}
                >
                  {row.label}
                </AnimoText>
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
                {row.value}
              </AnimoText>
            </View>
            {index < qualityRows.length - 1 ? (
              <View style={styles.qualityDivider} />
            ) : null}
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    aspectRatio: 16 / 9,
    backgroundColor: AnimoColors.surfaceQuaternary,
    borderRadius: AnimoRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryQuantity: {
    marginTop: AnimoSpacing.xs,
  },
  priceBlock: {
    marginTop: AnimoSpacing.lg,
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
  },
  priceLabel: {
    opacity: 0.85,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: AnimoSpacing.sm,
  },
  priceUnit: {
    opacity: 0.85,
    marginBottom: AnimoSpacing.xs,
  },
  priceTotal: {
    opacity: 0.8,
    marginTop: AnimoSpacing.xs,
  },
  qualityHeader: {
    marginBottom: AnimoSpacing.md,
  },
  qualityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: AnimoSpacing.md,
  },
  qualityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  qualityLabel: {
    marginLeft: AnimoSpacing.sm,
  },
  qualityDivider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
});
