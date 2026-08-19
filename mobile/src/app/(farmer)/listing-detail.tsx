import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Check, Inbox, PackageSearch, TriangleAlert, UserRound, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { BackHeader } from "@/components/animo/back-header";
import { FeedbackModal } from "@/components/animo/feedback-modal";
import { BuyerTrustStatsCard } from "@/components/animo/farmer/buyer-trust-stats-card";
import { ListingDetailContent } from "@/components/animo/farmer/listing-detail-content";
import { StatusBadge } from "@/components/animo/status-badge";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { useSession } from "@/hooks/use-session";
import { fetchCropListing, fetchListingPhotos } from "@/services/crop-listing-service";
import { fetchBuyerTrustStatsBatch, type BuyerTrustStats } from "@/services/farmer-public-profile";
import { rankPurchaseRequests, type RankedPurchaseRequest } from "@/services/marketplace-ranking";
import {
  acceptPurchaseRequest,
  fetchListingPurchaseRequests,
  rejectPurchaseRequest,
} from "@/services/purchase-request-service";
import type { CropListing, ListingPhoto } from "@/types/crop-listing";
import type { PurchaseRequest } from "@/types/purchase-request";

type DetailTab = "detalye" | "orders";

const REJECTION_REASONS = [
  "Kulang ang natitirang stock o naubos na",
  "Hindi tugma ang iskedyul ng pickup",
  "Masyadong mababa ang itinakdang dami",
  "Iba pang dahilan",
];

/** Palay Listing detail — quality/price summary plus real purchase requests, ranked by buyer trust/quantity/recency. */
export default function ListingDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { account } = useSession();
  const [activeTab, setActiveTab] = useState<DetailTab>(tab === "orders" ? "orders" : "detalye");
  const [listing, setListing] = useState<CropListing | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Orders state — pending requests only need to be re-ranked whenever the
  // request list or trust stats change; accepted/rejected rows drop off the
  // list entirely once acted on (they show up in the Transaksyon tab instead).
  const [ranked, setRanked] = useState<RankedPurchaseRequest[]>([]);
  const [trustByBuyer, setTrustByBuyer] = useState<Map<string, BuyerTrustStats>>(new Map());
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | undefined>();

  const [acceptingRequest, setAcceptingRequest] = useState<PurchaseRequest | null>(null);
  const [acceptQuantityText, setAcceptQuantityText] = useState("");
  const [acceptError, setAcceptError] = useState<string | undefined>();
  const [acceptedRequest, setAcceptedRequest] = useState<PurchaseRequest | null>(null);

  const [rejectingRequest, setRejectingRequest] = useState<PurchaseRequest | null>(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReasonNote, setCustomReasonNote] = useState("");
  const [rejectSuccessVisible, setRejectSuccessVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);
    fetchCropListing(id)
      .then(async (result) => {
        if (cancelled) return;
        setListing(result);
        if (!result) return;
        try {
          const listingPhotos = await fetchListingPhotos(result.id);
          if (!cancelled) setPhotos(listingPhotos);
        } catch {
          // Falls back to placeholder
        }
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : "Hindi ma-load ang listing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadOrders = useCallback(async () => {
    if (!id) return;
    setOrdersLoading(true);
    setOrdersError(undefined);
    try {
      const requests = await fetchListingPurchaseRequests(id);
      const pending = requests.filter((r) => r.status === "Pending");
      if (pending.length === 0) {
        setTrustByBuyer(new Map());
        setRanked([]);
        return;
      }
      const trustByBuyer = await fetchBuyerTrustStatsBatch(pending.map((r) => r.buyerId));
      setTrustByBuyer(trustByBuyer);
      setRanked(
        rankPurchaseRequests(
          pending.map((request) => ({
            request,
            reliabilityScore: trustByBuyer.get(request.buyerId)?.reliabilityScore ?? 0.5,
          })),
        ),
      );
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Hindi ma-load ang mga kahilingan.");
    } finally {
      setOrdersLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openAcceptModal = (request: PurchaseRequest) => {
    const cap = Math.min(request.requestedQuantityKg, listing?.remainingQuantityKg ?? request.requestedQuantityKg);
    setAcceptQuantityText(String(cap));
    setAcceptError(undefined);
    setAcceptingRequest(request);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingRequest) return;
    const quantity = parseFloat(acceptQuantityText) || 0;
    if (quantity <= 0) {
      setAcceptError("Dapat mas malaki sa 0 ang tatanggaping dami.");
      return;
    }
    try {
      await acceptPurchaseRequest(acceptingRequest.id, quantity);
      const accepted = acceptingRequest;
      setAcceptingRequest(null);
      setAcceptedRequest(accepted);
      // Refetch both — remaining_quantity_kg changed, and other pending
      // requests may have cascaded to No_Quantity_Remaining if this sold out.
      await Promise.all([
        loadOrders(),
        fetchCropListing(id).then((result) => result && setListing(result)),
      ]);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Hindi matanggap ang kahilingan.");
    }
  };

  const handleOpenReject = (request: PurchaseRequest) => {
    setRejectingRequest(request);
    setSelectedReason(REJECTION_REASONS[0]);
    setCustomReasonNote("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    try {
      await rejectPurchaseRequest(rejectingRequest.id);
      setRejectingRequest(null);
      setRejectSuccessVisible(true);
      await loadOrders();
    } catch (err) {
      setRejectingRequest(null);
      setOrdersError(err instanceof Error ? err.message : "Hindi matanggihan ang kahilingan.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <BackHeader title="Detalye ng Listing" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !listing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <BackHeader title="Detalye ng Listing" />
        <View style={styles.emptyScreen}>
          <View style={styles.emptyIconWrap}>
            <PackageSearch size={32} color={AnimoColors.accentPrimary} />
          </View>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
            Hindi nahanap ang listing
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
            {errorMessage ?? "Hindi nahanap ang listing na ito. Maaaring natanggal na ito o hindi ito sa iyo."}
          </AnimoText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(farmer)/(tabs)/palengke")}
            style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
              Bumalik sa Aking Ani
            </AnimoText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = ranked.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <BackHeader title="Detalye ng Listing" />

      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab("detalye")}
            style={[styles.tab, activeTab === "detalye" && styles.tabActive]}>
            <AnimoText variant="bodyEmphasis" color={activeTab === "detalye" ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
              Detalye ng Listing
            </AnimoText>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab("orders")}
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}>
            <AnimoText variant="bodyEmphasis" color={activeTab === "orders" ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
              Mga Orders {pendingCount > 0 ? `(${pendingCount})` : ""}
            </AnimoText>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === "detalye" ? (
          <ListingDetailContent listing={listing} photos={photos} location={account?.barangay} />
        ) : ordersLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={AnimoColors.accentPrimary} />
          </View>
        ) : ordersError ? (
          <View style={styles.centerState}>
            <AnimoText variant="body" color={AnimoColors.danger}>
              {ordersError}
            </AnimoText>
          </View>
        ) : (
          <View style={styles.ordersSection}>
            {ranked.length === 0 ? (
              <OrdersEmptyState />
            ) : (
              <>
                <View style={styles.ordersHeaderRow}>
                  <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
                    Order Requests
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                    {ranked.length} kabuuan
                  </AnimoText>
                </View>
                {ranked.map(({ request }) => (
                  <PurchaseRequestCard
                    key={request.id}
                    request={request}
                    pricePerKg={listing.pricePerKg ?? 0}
                    trustStats={trustByBuyer.get(request.buyerId)}
                    onAccept={() => openAcceptModal(request)}
                    onReject={() => handleOpenReject(request)}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ACCEPT — quantity confirmation modal (supports partial acceptance) */}
      <Modal visible={acceptingRequest !== null} transparent animationType="fade" onRequestClose={() => setAcceptingRequest(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAcceptingRequest(null)}>
          <Pressable style={styles.rejectCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.acceptIconCircle}>
              <Check size={28} color={AnimoColors.accentPrimary} />
            </View>
            <View style={styles.rejectHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                Tanggapin ang Kahilingan?
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                Hiniling: {acceptingRequest?.requestedQuantityKg} kg. Maaari mong baguhin kung nais mong
                bahagyang tanggapin lamang.
              </AnimoText>
            </View>

            <View style={styles.customInputWrap}>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={acceptQuantityText}
                onChangeText={(t) => setAcceptQuantityText(t.replace(/[^0-9.]/g, ""))}
                placeholder="Dami (kg)"
              />
            </View>
            {acceptError ? (
              <AnimoText variant="caption" color={AnimoColors.danger}>
                {acceptError}
              </AnimoText>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmAccept}
                style={({ pressed }) => [styles.acceptModalBtn, pressed && styles.pressed]}>
                <Check size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  Tanggapin
                </AnimoText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAcceptingRequest(null)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Huwag Muna
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FeedbackModal
        visible={acceptedRequest !== null}
        tone="success"
        title="Tinanggap ang Kahilingan!"
        message={
          acceptedRequest
            ? `Matagumpay mong tinanggap ang kahilingan para sa ${acceptedRequest.requestedQuantityKg} kg. Makikita na ito sa iyong mga transaksyon.`
            : ""
        }
        confirmLabel="Sige, Salamat"
        onConfirm={() => setAcceptedRequest(null)}
        secondaryLabel="Tingnan sa Transaksyon"
        onSecondary={() => {
          setAcceptedRequest(null);
          router.push("/(farmer)/(tabs)/transaksyon");
        }}
      />

      {/* REJECT REASON PROMPT MODAL — reason is farmer-intent-only UI; no `purchaserequest` column stores it. */}
      <Modal visible={rejectingRequest !== null} transparent animationType="fade" onRequestClose={() => setRejectingRequest(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRejectingRequest(null)}>
          <Pressable style={styles.rejectCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.rejectIconCircle}>
              <TriangleAlert size={28} color={AnimoColors.danger} />
            </View>

            <View style={styles.rejectHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                Tanggihan ang Kahilingan?
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                Pumili o maglagay ng dahilan (para sa iyong sariling talaan lamang):
              </AnimoText>
            </View>

            <View style={styles.reasonsList}>
              {REJECTION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    accessibilityRole="radio"
                    onPress={() => setSelectedReason(reason)}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioInnerDot} /> : null}
                    </View>
                    <AnimoText
                      variant={isSelected ? "bodyEmphasis" : "body"}
                      color={isSelected ? AnimoColors.accentPrimary : AnimoColors.textHighEmphasis}
                      style={styles.flex}>
                      {reason}
                    </AnimoText>
                  </Pressable>
                );
              })}
            </View>

            {selectedReason === "Iba pang dahilan" ? (
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Isulat ang partikular na dahilan dito..."
                  placeholderTextColor={AnimoColors.textLowEmphasis}
                  value={customReasonNote}
                  onChangeText={setCustomReasonNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmReject}
                style={({ pressed }) => [styles.confirmRejectBtn, pressed && styles.pressed]}>
                <X size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  Tanggihan ang Order
                </AnimoText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setRejectingRequest(null)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Bumalik
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FeedbackModal
        visible={rejectSuccessVisible}
        tone="info"
        title="Tinanggihan ang Kahilingan"
        message="Naitala ang iyong sagot."
        confirmLabel="Naiintindihan Ko"
        onConfirm={() => setRejectSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}

function OrdersEmptyState() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Inbox size={32} color={AnimoColors.accentPrimary} />
      </View>
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.emptyTitle}>
        Wala pang kahilingan
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.textLowEmphasis} style={styles.emptyBody}>
        Kapag may mamimiling interesado sa listing na ito, lalabas dito ang kanilang order.
        Hintaying dumating ang unang kahilingan.
      </AnimoText>
    </View>
  );
}

function PurchaseRequestCard({
  request,
  pricePerKg,
  trustStats,
  onAccept,
  onReject,
}: {
  request: PurchaseRequest;
  pricePerKg: number;
  trustStats?: BuyerTrustStats;
  onAccept: () => void;
  onReject: () => void;
}) {
  const openBuyerProfile = () => {
    router.push({
      pathname: "/(farmer)/mamimili/[id]",
      params: {
        id: request.buyerId,
        quantityKg: String(request.requestedQuantityKg),
        total: String(request.requestedQuantityKg * pricePerKg),
      },
    });
  };

  return (
    <View style={[styles.requestCard, styles.shadow]}>
      <View style={styles.requestTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tingnan ang profile ng mamimili"
          hitSlop={8}
          onPress={openBuyerProfile}
          style={styles.requestAvatar}>
          <UserRound size={22} color={AnimoColors.accentPrimary} />
        </Pressable>
        <View style={styles.requestInfo}>
          <View style={styles.requestInfoTop}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={openBuyerProfile}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                Kahilingan ng Mamimili
              </AnimoText>
            </Pressable>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {request.requestedQuantityKg} kg
            </AnimoText>
          </View>
          <View style={styles.requestBottomRow}>
            <AnimoText variant="h3" color={AnimoColors.accentPrimary}>
              {formatPeso(request.requestedQuantityKg * pricePerKg)}
            </AnimoText>
            {request.status !== "Pending" ? <StatusBadge label={request.status} tone="neutral" /> : null}
          </View>
        </View>
      </View>

      {trustStats ? (
        <BuyerTrustStatsCard stats={trustStats} onPressProfile={openBuyerProfile} />
      ) : null}

      {request.status === "Pending" ? (
        <View style={styles.requestActions}>
          <Pressable accessibilityRole="button" onPress={onReject} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
            <X size={16} color={AnimoColors.caution} />
            <AnimoText variant="bodyEmphasis" color={AnimoColors.caution}>
              Tanggihan
            </AnimoText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onAccept} style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}>
            <Check size={16} color={AnimoColors.white} />
            <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
              Tanggapin
            </AnimoText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: AnimoSpacing.xl },
  tabsWrapper: { paddingHorizontal: AnimoSpacing.lg, paddingVertical: AnimoSpacing.sm, backgroundColor: AnimoColors.appBackground },
  tabsContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.pill,
    padding: 3,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: AnimoRadius.pill, backgroundColor: "transparent" },
  tabActive: { backgroundColor: AnimoColors.accentPrimary },
  scrollContent: { paddingHorizontal: AnimoSpacing.lg, paddingTop: AnimoSpacing.sm, paddingBottom: AnimoSpacing.xxl, gap: AnimoSpacing.lg },
  ordersSection: { gap: AnimoSpacing.md },
  ordersHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 2 },
  emptyScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AnimoSpacing.xl,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.xxl,
    marginTop: AnimoSpacing.lg,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AnimoSpacing.lg,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyBody: {
    textAlign: "center",
    marginTop: AnimoSpacing.sm,
  },
  emptyCta: {
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.xl,
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xl,
  },
  shadow: { shadowColor: AnimoColors.darkBackground, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  requestCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    gap: AnimoSpacing.md,
  },
  requestTopRow: { flexDirection: "row", alignItems: "center" },
  requestAvatar: { width: 44, height: 44, borderRadius: AnimoRadius.pill, backgroundColor: AnimoColors.accentPrimaryLight, alignItems: "center", justifyContent: "center" },
  requestInfo: { flex: 1, marginLeft: AnimoSpacing.md, gap: 3 },
  requestInfoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestActions: { flexDirection: "row", gap: AnimoSpacing.md, paddingTop: 4, borderTopWidth: 1, borderTopColor: AnimoColors.borderLowEmphasis },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoSpacing.xs,
    borderWidth: 1.5,
    borderColor: AnimoColors.caution,
    borderRadius: AnimoRadius.md,
    paddingVertical: 10,
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
    paddingVertical: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: AnimoSpacing.lg },
  rejectCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  rejectIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: AnimoColors.dangerTint, alignItems: "center", justifyContent: "center" },
  acceptIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: AnimoColors.accentPrimaryLight, alignItems: "center", justifyContent: "center" },
  rejectHeaderGroup: { alignItems: "center", gap: AnimoSpacing.xs },
  textCenter: { textAlign: "center" },
  reasonsList: { width: "100%", gap: AnimoSpacing.sm, marginTop: 4 },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.md,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  reasonOptionSelected: { borderColor: AnimoColors.accentPrimary, backgroundColor: AnimoColors.accentPrimaryLight },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: AnimoColors.borderLowEmphasis, alignItems: "center", justifyContent: "center" },
  radioCircleSelected: { borderColor: AnimoColors.accentPrimary },
  radioInnerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AnimoColors.accentPrimary },
  flex: { flex: 1 },
  customInputWrap: { width: "100%", borderWidth: 1, borderColor: AnimoColors.borderLowEmphasis, borderRadius: AnimoRadius.md, padding: AnimoSpacing.sm, backgroundColor: AnimoColors.surfaceSecondary },
  customInput: { fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: AnimoColors.textHighEmphasis, textAlignVertical: "top", },
  modalActions: { width: "100%", gap: AnimoSpacing.sm, marginTop: 6 },
  confirmRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoSpacing.sm,
    width: "100%",
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.danger,
  },
  acceptModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoSpacing.sm,
    width: "100%",
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
  },
  cancelDismissBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pressed: { opacity: 0.85 },
});
