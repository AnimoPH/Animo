import { useLocalSearchParams } from "expo-router";
import { Check, UserRound, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { BackHeader } from "@/components/animo/back-header";
import { ListingDetailContent } from "@/components/animo/farmer/listing-detail-content";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { fetchCropListing } from "@/services/crop-listing-service";
import type { CropListing } from "@/types/crop-listing";

type DetailTab = "detalye" | "orders";

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
  {
    id: "4",
    buyer: "Aling Coring Rice Mill",
    quantity: "100 kg",
    total: "₱1,000.00",
  },
];

/** Palay Listing detail — quality/price summary plus purchase requests from buyers. */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>("detalye");
  const [listing, setListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);
    fetchCropListing(id)
      .then((result) => {
        if (!cancelled) setListing(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Hindi ma-load ang listing.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <BackHeader title="Palay Listing" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !listing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <BackHeader title="Palay Listing" />
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {errorMessage ?? "Hindi nahanap ang listing na ito."}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <BackHeader title="Palay Listing" />

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Tab */}
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

        {/* Detail Listing Content */}
        {activeTab === "detalye" ? (
          <ListingDetailContent listing={listing} />
        ) : (
          <>
            <AnimoText
              variant="h3"
              color={AnimoColors.textHighEmphasis}
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AnimoSpacing.xl,
  },
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  tabsContainer: {
    flexDirection: "row",
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
    marginHorizontal: AnimoSpacing.lg,
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  requestCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
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
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
