import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Check, CheckCircle2, TriangleAlert, UserRound, X } from "lucide-react-native";
import { useEffect, useState } from "react";
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

import { AnimoButton } from "@/components/animo/animo-button";
import { AnimoText } from "@/components/animo/animo-text";
import { ScreenHeader } from "@/components/animo/screen-header";
import { FeedbackModal } from "@/components/animo/feedback-modal";
import { ListingDetailContent } from "@/components/animo/farmer/listing-detail-content";
import { StatusBadge } from "@/components/animo/status-badge";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { useSession } from "@/hooks/use-session";
import { fetchCropListing, fetchListingPhotos } from "@/services/crop-listing-service";
import type { CropListing, ListingPhoto } from "@/types/crop-listing";

type DetailTab = "detalye" | "orders";

type PurchaseRequestStatus = "pending" | "accepted" | "rejected";

type PurchaseRequest = {
  id: string;
  buyer: string;
  quantity: string;
  total: string;
  status: PurchaseRequestStatus;
};

const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: "1",
    buyer: "Bulacan Rice Traders",
    quantity: "300 kg",
    total: "₱4,800.00",
    status: "pending",
  },
  {
    id: "2",
    buyer: "San Rafael Coop",
    quantity: "100 kg",
    total: "₱1,600.00",
    status: "pending",
  },
  {
    id: "3",
    buyer: "Aling Nena Rice Mill",
    quantity: "100 kg",
    total: "₱1,600.00",
    status: "pending",
  },
  {
    id: "4",
    buyer: "Aling Coring Rice Mill",
    quantity: "100 kg",
    total: "₱1,600.00",
    status: "pending",
  },
];

const REJECTION_REASONS = [
  "Kulang ang natitirang stock o naubos na",
  "Hindi tugma ang iskedyul ng pickup",
  "Masyadong mababa ang itinakdang dami",
  "Iba pang dahilan",
];

/** Palay Listing detail — quality/price summary plus purchase requests from buyers with full modal flows. */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useSession();
  const [activeTab, setActiveTab] = useState<DetailTab>("detalye");
  const [listing, setListing] = useState<CropListing | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Orders State
  const [requests, setRequests] = useState<PurchaseRequest[]>(INITIAL_PURCHASE_REQUESTS);

  // Accept Success Modal State
  const [acceptedRequest, setAcceptedRequest] = useState<PurchaseRequest | null>(null);

  // Reject Modal State
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

  const handleAccept = (req: PurchaseRequest) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" as const } : r)),
    );
    setAcceptedRequest(req);
  };

  const handleOpenReject = (req: PurchaseRequest) => {
    setRejectingRequest(req);
    setSelectedReason(REJECTION_REASONS[0]);
    setCustomReasonNote("");
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === rejectingRequest.id ? { ...r, status: "rejected" as const } : r,
      ),
    );
    setRejectingRequest(null);
    setRejectSuccessVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScreenHeader title="Detalye ng Listing" />
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
        <ScreenHeader title="Detalye ng Listing" />
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {errorMessage ?? "Hindi nahanap ang listing na ito."}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalye ng Listing" />

      {/* Segment Navigation Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab("detalye")}
            style={[styles.tab, activeTab === "detalye" && styles.tabActive]}>
            <AnimoText
              variant="bodyEmphasis"
              color={activeTab === "detalye" ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
              Detalye ng Listing
            </AnimoText>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            onPress={() => setActiveTab("orders")}
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}>
            <AnimoText
              variant="bodyEmphasis"
              color={activeTab === "orders" ? AnimoColors.white : AnimoColors.textMediumEmphasis}>
              Mga Orders {pendingCount > 0 ? `(${pendingCount})` : ""}
            </AnimoText>
          </Pressable>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {activeTab === "detalye" ? (
          <ListingDetailContent
            listing={listing}
            photos={photos}
            location={account?.barangay}
          />
        ) : (
          <View style={styles.ordersSection}>
            <View style={styles.ordersHeaderRow}>
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
                Mga Kahilingan mula sa Mamimili
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                {requests.length} kabuuan
              </AnimoText>
            </View>

            {requests.map((request) => (
              <PurchaseRequestCard
                key={request.id}
                request={request}
                onAccept={() => handleAccept(request)}
                onReject={() => handleOpenReject(request)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ACCEPT SUCCESS MODAL */}
      <FeedbackModal
        visible={acceptedRequest !== null}
        tone="success"
        title="Tinanggap ang Kahilingan!"
        message={
          acceptedRequest
            ? `Matagumpay mong tinanggap ang order ni ${acceptedRequest.buyer} para sa ${acceptedRequest.quantity} (${acceptedRequest.total}). Maaari mo nang tingnan ang kanyang impormasyon para sa pickup.`
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

      {/* REJECT REASON PROMPT MODAL */}
      <Modal
        visible={rejectingRequest !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectingRequest(null)}>
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
                Pumili o maglagay ng dahilan kung bakit tatanggihan ang order ni {rejectingRequest?.buyer}:
              </AnimoText>
            </View>

            {/* Reason Presets */}
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

            {/* Custom Notes Input */}
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

            {/* Action Buttons */}
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

      {/* REJECT CONFIRMATION FEEDBACK MODAL */}
      <FeedbackModal
        visible={rejectSuccessVisible}
        tone="info"
        title="Tinanggihan ang Kahilingan"
        message="Naitala na ang iyong sagot at naipagbigay-alam sa mamimili ang dahilan ng pagtanggi."
        confirmLabel="Naiintindihan Ko"
        onConfirm={() => setRejectSuccessVisible(false)}
      />
    </SafeAreaView>
  );
}

function PurchaseRequestCard({
  request,
  onAccept,
  onReject,
}: {
  request: PurchaseRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  const openBuyerProfile = () => {
    router.push({
      pathname: "/(farmer)/mamimili/[id]",
      params: { id: request.id },
    });
  };

  return (
    <View style={[styles.requestCard, styles.shadow]}>
      <View style={styles.requestTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tingnan ang profile ni ${request.buyer}`}
          hitSlop={8}
          onPress={openBuyerProfile}
          style={styles.requestAvatar}>
          <UserRound size={22} color={AnimoColors.accentPrimary} />
        </Pressable>
        <View style={styles.requestInfo}>
          <View style={styles.requestInfoTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tingnan ang profile ni ${request.buyer}`}
              hitSlop={8}
              onPress={openBuyerProfile}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                {request.buyer}
              </AnimoText>
            </Pressable>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {request.quantity}
            </AnimoText>
          </View>
          <View style={styles.requestBottomRow}>
            <AnimoText variant="h3" color={AnimoColors.accentPrimary}>
              {request.total}
            </AnimoText>
            {request.status === "accepted" ? (
              <StatusBadge label="Tinanggap" tone="success" icon={<CheckCircle2 size={12} color={AnimoColors.accentPrimary} />} />
            ) : request.status === "rejected" ? (
              <StatusBadge label="Tinanggihan" tone="danger" />
            ) : null}
          </View>
        </View>
      </View>

      {/* Action Buttons for Pending Requests */}
      {request.status === "pending" ? (
        <View style={styles.requestActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onReject}
            style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}>
            <X size={16} color={AnimoColors.caution} />
            <AnimoText variant="bodyEmphasis" color={AnimoColors.caution}>
              Tanggihan
            </AnimoText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onAccept}
            style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}>
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
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AnimoSpacing.xl,
  },
  tabsWrapper: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    backgroundColor: AnimoColors.appBackground,
  },
  tabsContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.pill,
    padding: 3,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: AnimoRadius.pill,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.lg,
  },
  ordersSection: {
    gap: AnimoSpacing.md,
  },
  ordersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 2,
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
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    gap: AnimoSpacing.md,
  },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  requestInfo: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
    gap: 3,
  },
  requestInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestActions: {
    flexDirection: "row",
    gap: AnimoSpacing.md,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: AnimoSpacing.lg,
  },
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
  rejectIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AnimoColors.dangerTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectHeaderGroup: {
    alignItems: "center",
    gap: AnimoSpacing.xs,
  },
  textCenter: {
    textAlign: "center",
  },
  reasonsList: {
    width: "100%",
    gap: AnimoSpacing.sm,
    marginTop: 4,
  },
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
  reasonOptionSelected: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AnimoColors.borderLowEmphasis,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: AnimoColors.accentPrimary,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.accentPrimary,
  },
  flex: {
    flex: 1,
  },
  customInputWrap: {
    width: "100%",
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  customInput: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AnimoColors.textHighEmphasis,
    textAlignVertical: "top",
    minHeight: 60,
  },
  modalActions: {
    width: "100%",
    gap: AnimoSpacing.sm,
    marginTop: 6,
  },
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
  pressed: {
    opacity: 0.85,
  },
});
