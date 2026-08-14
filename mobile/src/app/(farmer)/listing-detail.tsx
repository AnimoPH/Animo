import { useLocalSearchParams } from "expo-router";
import {
  Check,
  CheckCircle,
  Droplets,
  ImageIcon,
  Leaf,
  Scale,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoButton } from "@/components/animo/animo-button";
import { AnimoText } from "@/components/animo/animo-text";
import { BackHeader } from "@/components/animo/back-header";
import { StatusBadge } from "@/components/animo/status-badge";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";

const SCREEN_PADDING = AnimoSpacing.lg;

type DetailTab = "detalye" | "orders";

const QUALITY_ROWS = [
  { Icon: Leaf, label: "Uri ng palay", value: "RC218" },
  { Icon: Droplets, label: "Moisture content", value: "Tuyo (Dry)" },
  { Icon: ShieldCheck, label: "Purity grade", value: "Grade A" },
  { Icon: Scale, label: "Weight", value: "500 kg" },
];

type PurchaseRequest = {
  id: string;
  buyer: string;
  quantity: string;
  total: string;
};

const PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: "1",
    buyer: "Bulacan Rice Traders",
    quantity: "300 kg",
    total: "₱3,000.00",
  },
  { id: "2", buyer: "San Rafael Coop", quantity: "100 kg", total: "₱1,000.00" },
  {
    id: "3",
    buyer: "Aling Nena Rice Mill",
    quantity: "100 kg",
    total: "₱1,000.00",
  },
];

/** Palay Listing detail — quality/price summary plus purchase requests from buyers. */
export default function ListingDetailScreen() {
  useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>("detalye");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <BackHeader title="Palay Listing" />

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabsContainer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab("detalye")}
            style={[styles.tab, activeTab === "detalye" && styles.tabActive]}
          >
            <AnimoText
              variant={activeTab === "detalye" ? "bodyEmphasis" : "body"}
              color={
                activeTab === "detalye"
                  ? AnimoColors.textHighEmphasisInverse
                  : AnimoColors.textMediumEmphasis
              }
            >
              Detalye ng Listing
            </AnimoText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab("orders")}
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}
          >
            <AnimoText
              variant={activeTab === "orders" ? "bodyEmphasis" : "body"}
              color={
                activeTab === "orders"
                  ? AnimoColors.textHighEmphasisInverse
                  : AnimoColors.textMediumEmphasis
              }
            >
              Mga Orders
            </AnimoText>
          </Pressable>
        </View>

        {activeTab === "detalye" ? (
          <>
            {/* Palay Image */}
            <View style={styles.heroImage}>
              <ImageIcon size={40} color={AnimoColors.objectLowEmphasis} />
            </View>

            <View style={[styles.card, styles.shadow]}>
              {/* First Card */}
              <View style={styles.summaryTopRow}>
                <View>
                  <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
                    Palay RC218
                  </AnimoText>
                  <AnimoText
                    variant="caption"
                    color={AnimoColors.textLowEmphasis}
                    style={styles.summaryQuantity}
                  >
                    (200 kg)
                  </AnimoText>
                </View>
                <StatusBadge
                  label="Now Available"
                  tone="success"
                  icon={
                    <CheckCircle size={12} color={AnimoColors.accentPrimary} />
                  }
                />
              </View>

              {/* Price Card */}
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
                    ₱25.00
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
                  Kabuuan na halaga (200kg): ₱5,000.00
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

              {QUALITY_ROWS.map((row, index) => (
                <View key={row.label}>
                  <View style={styles.qualityRow}>
                    <View style={styles.qualityLeft}>
                      <row.Icon
                        size={16}
                        color={AnimoColors.objectLowEmphasis}
                      />
                      <AnimoText
                        variant="body"
                        color={AnimoColors.textMediumEmphasis}
                        style={styles.qualityLabel}
                      >
                        {row.label}
                      </AnimoText>
                    </View>
                    <AnimoText
                      variant="bodyEmphasis"
                      color={AnimoColors.accentPrimary}
                    >
                      {row.value}
                    </AnimoText>
                  </View>
                  {index < QUALITY_ROWS.length - 1 ? (
                    <View style={styles.qualityDivider} />
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <AnimoText
              variant="h3"
              color={AnimoColors.textHighEmphasis}
              style={styles.ordersHeader}
            >
              Mga Kahilingan mula sa Mamimili
            </AnimoText>

            {PURCHASE_REQUESTS.map((request) => (
              <PurchaseRequestCard key={request.id} request={request} />
            ))}
          </>
        )}
      </ScrollView>

      {/* <View style={styles.bottomBar}>
        <AnimoButton
          label="Tignan lahat ng kahilingan"
          variant="primary"
          onPress={() => console.log("Tignan lahat ng kahilingan pressed")}
        />
      </View> */}
    </SafeAreaView>
  );
}

function PurchaseRequestCard({ request }: { request: PurchaseRequest }) {
  return (
    <View style={[styles.requestCard, styles.shadow]}>
      <View style={styles.requestTopRow}>
        <View style={styles.requestAvatar}>
          <UserRound size={22} color={AnimoColors.accentPrimary} />
        </View>
        <View style={styles.requestInfo}>
          <View style={styles.requestInfoTop}>
            <AnimoText
              variant="bodyEmphasis"
              color={AnimoColors.textHighEmphasis}
            >
              {request.buyer}
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {request.quantity}
            </AnimoText>
          </View>
          <AnimoText
            variant="h3"
            color={AnimoColors.accentPrimary}
            style={styles.requestTotal}
          >
            {request.total}
          </AnimoText>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => console.log("Tanggihan pressed")}
          style={styles.rejectButton}
        >
          <X size={16} color={AnimoColors.caution} />
          <AnimoText variant="bodyEmphasis" color={AnimoColors.caution}>
            Reject
          </AnimoText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => console.log("Tanggapin pressed")}
          style={styles.acceptButton}
        >
          <Check size={16} color={AnimoColors.objectHighEmphasisInverse} />
          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.objectHighEmphasisInverse}
          >
            Accept
          </AnimoText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: AnimoSpacing.sm,
    alignItems: "center",
    borderRadius: AnimoRadius.md,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xxl,
    flexGrow: 1,
    gap: AnimoSpacing.lg,
  },
  heroImage: {
    aspectRatio: 16 / 9,
    backgroundColor: AnimoColors.surfaceQuaternary,
    borderRadius: AnimoRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: SCREEN_PADDING,
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
    marginHorizontal: SCREEN_PADDING,
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
    marginTop: AnimoSpacing.md,
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
  ordersHeader: {
    marginHorizontal: SCREEN_PADDING,
  },
  requestCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    padding: AnimoSpacing.lg,
  },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentSecondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  requestInfo: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  requestInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  requestTotal: {
    marginTop: AnimoSpacing.xs,
  },
  requestActions: {
    flexDirection: "row",
    gap: AnimoSpacing.md,
    marginTop: AnimoSpacing.lg,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoSpacing.xs,
    borderWidth: 1.5,
    borderColor: AnimoColors.caution,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoSpacing.xs,
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.sm,
  },
  bottomBar: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
