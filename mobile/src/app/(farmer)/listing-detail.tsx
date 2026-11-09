import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Archive,
  Check,
  Info,
  TriangleAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { BuyerTrustStatsCard } from "@/components/animo/farmer/buyer-trust-stats-card";
import {
  ListingActionsSheet,
  ListingOverflowButton,
} from "@/components/animo/farmer/listing-actions-sheet";
import {
  ListingDetailContent,
  ListingDetailHeader,
} from "@/components/animo/farmer/listing-detail-content";
import { ChunkyButton } from "@/components/animo/ui/chunky-button";
import { DepthCard } from "@/components/animo/ui/depth-card";
import { V2Dialog } from "@/components/animo/ui/dialog";
import { IconTile } from "@/components/animo/ui/icon-tile";
import { Mascot } from "@/components/animo/ui/mascot";
import { OptionCard } from "@/components/animo/ui/option-card";
import { V2BackHeader } from "@/components/animo/ui/screen-bits";
import { SegmentedTabs } from "@/components/animo/ui/segmented-tabs";
import { QuantityStepper } from "@/components/animo/ui/stepper";
import { StatusPill } from "@/components/animo/ui/status-pill";
import { TextField } from "@/components/animo/ui/text-field";
import { AnimoV2Colors, AnimoV2Spacing } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { useLanguage } from "@/hooks/use-language";
import type { TranslationKey } from "@/i18n/translations";
import {
  archiveCropListing,
  deleteCropListing,
  fetchCropListing,
  fetchListingPhotos,
  listingEverHadRequest,
  listingHasActiveDeal,
} from "@/services/crop-listing-service";
import {
  fetchBuyerTrustStatsBatch,
  type BuyerTrustStats,
} from "@/services/farmer-public-profile";
import {
  acceptPurchaseRequest,
  acceptPurchaseRequestFailureMessage,
  fetchListingPurchaseRequests,
  isPurchaseRequestNoLongerPending,
  rejectPurchaseRequest,
} from "@/services/purchase-request-service";
import { fetchCounterpartNames } from "@/services/transaction-service";
import type { CropListing, ListingPhoto } from "@/types/crop-listing";
import type { PurchaseRequest } from "@/types/purchase-request";

type DetailTab = "detalye" | "orders";
type ConfirmAction = "archive" | "delete" | null;

/** Accept quantity moves in steps of 50 kg (DESIGN_SPEC section 5). */
const QUANTITY_STEP_KG = 50;

/** Reject reasons are farmer-intent-only UI; no `purchaserequest` column stores them. */
const REJECTION_REASONS: { key: string; label: TranslationKey }[] = [
  { key: "stock", label: "ordersV2.reasonStock" },
  { key: "pickup", label: "ordersV2.reasonPickup" },
  { key: "quantity", label: "ordersV2.reasonQty" },
  { key: "other", label: "ordersV2.reasonOther" },
];

/** Palay Listing detail: quality/price summary plus real purchase requests, oldest first. */
export default function ListingDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DetailTab>(
    tab === "orders" ? "orders" : "detalye",
  );
  const [listing, setListing] = useState<CropListing | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [hasActiveDeal, setHasActiveDeal] = useState(false);
  const [everHadRequest, setEverHadRequest] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const [actionSuccess, setActionSuccess] = useState<
    "archive" | "delete" | null
  >(null);

  // Orders state: pending requests, oldest first; accepted/rejected rows
  // drop off the list entirely once acted on (they show up in the
  // Transaksyon tab instead).
  const [orderedRequests, setOrderedRequests] = useState<PurchaseRequest[]>([]);
  const [buyerNames, setBuyerNames] = useState<Map<string, string>>(new Map());
  const [trustByBuyer, setTrustByBuyer] = useState<
    Map<string, BuyerTrustStats>
  >(new Map());
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | undefined>();
  const [staleAcceptNotice, setStaleAcceptNotice] = useState<string | undefined>();

  const [acceptingRequest, setAcceptingRequest] =
    useState<PurchaseRequest | null>(null);
  const [acceptQuantityText, setAcceptQuantityText] = useState("");
  const [acceptError, setAcceptError] = useState<string | undefined>();
  const [acceptedRequest, setAcceptedRequest] =
    useState<PurchaseRequest | null>(null);

  const [rejectingRequest, setRejectingRequest] =
    useState<PurchaseRequest | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
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
          const [listingPhotos, active, everHad] = await Promise.all([
            fetchListingPhotos(result.id),
            listingHasActiveDeal(result.id),
            listingEverHadRequest(result.id),
          ]);
          if (cancelled) return;
          setPhotos(listingPhotos);
          setHasActiveDeal(active);
          setEverHadRequest(everHad);
        } catch {
          // Falls back to placeholder / conservative action gates
        }
      })
      .catch((err) => {
        if (!cancelled)
          setErrorMessage(
            err instanceof Error ? err.message : t("detailV2.loadError"),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOrders = useCallback(async () => {
    if (!id) return;
    setOrdersLoading(true);
    setOrdersError(undefined);
    try {
      const requests = await fetchListingPurchaseRequests(id);
      // Oldest submitted first: plain FIFO order, no ranking algorithm
      // (Research Notes Sec. AC.7 excludes farmer-side buyer WPM ranking).
      const pending = requests
        .filter((r) => r.status === "Pending")
        .sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime(),
        );
      if (pending.length === 0) {
        setBuyerNames(new Map());
        setTrustByBuyer(new Map());
        setOrderedRequests([]);
        return;
      }
      const buyerIds = pending.map((r) => r.buyerId);
      const [trustByBuyer, names] = await Promise.all([
        fetchBuyerTrustStatsBatch(buyerIds),
        fetchCounterpartNames(buyerIds),
      ]);
      setBuyerNames(names);
      setTrustByBuyer(trustByBuyer);
      setOrderedRequests(pending);
    } catch (err) {
      setOrdersError(
        err instanceof Error ? err.message : t("ordersV2.loadError"),
      );
    } finally {
      setOrdersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const acceptCap = (request: PurchaseRequest) =>
    Math.min(
      request.requestedQuantityKg,
      listing?.remainingQuantityKg ?? request.requestedQuantityKg,
    );

  const openAcceptModal = (request: PurchaseRequest) => {
    setStaleAcceptNotice(undefined);
    setAcceptQuantityText(String(acceptCap(request)));
    setAcceptError(undefined);
    setAcceptingRequest(request);
  };

  const handleConfirmAccept = async () => {
    if (!acceptingRequest) return;
    const quantity = parseFloat(acceptQuantityText) || 0;
    if (quantity <= 0) {
      setAcceptError(t("ordersV2.qtyInvalid"));
      return;
    }
    try {
      await acceptPurchaseRequest(acceptingRequest.id, quantity);
      const accepted = acceptingRequest;
      setAcceptingRequest(null);
      setAcceptedRequest(accepted);
      // Refetch both: remaining_quantity_kg changed, and other pending
      // requests may have cascaded to No_Quantity_Remaining if this sold out.
      await Promise.all([
        loadOrders(),
        fetchCropListing(id).then((result) => result && setListing(result)),
      ]);
    } catch (err) {
      if (isPurchaseRequestNoLongerPending(err)) {
        setAcceptingRequest(null);
        setAcceptError(undefined);
        setStaleAcceptNotice(t("ordersV2.staleAccept"));
        await loadOrders();
        return;
      }
      setAcceptError(acceptPurchaseRequestFailureMessage(err));
    }
  };

  const handleOpenReject = (request: PurchaseRequest) => {
    setRejectingRequest(request);
    setSelectedReason(null);
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
      setOrdersError(
        err instanceof Error ? err.message : t("ordersV2.rejectFailed"),
      );
    }
  };

  const isArchived = listing?.status === "Archived";
  const canEdit = Boolean(listing) && !isArchived;
  const canArchive = Boolean(listing) && !isArchived && !hasActiveDeal;
  const canDelete = Boolean(listing) && !everHadRequest && !isArchived;

  const handleConfirmListingAction = async () => {
    if (!id || !confirmAction || actionBusy) return;
    setActionBusy(true);
    setActionError(undefined);
    try {
      if (confirmAction === "archive") {
        await archiveCropListing(id);
        setConfirmAction(null);
        setActionSuccess("archive");
      } else {
        await deleteCropListing(id);
        setConfirmAction(null);
        setActionSuccess("delete");
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("detailV2.actionFailed"),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const goBack = () => router.back();

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <V2BackHeader title={t("detailV2.title")} backLabel={t("common.back")} onBack={goBack} />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  if (errorMessage || !listing) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <V2BackHeader title={t("detailV2.title")} backLabel={t("common.back")} onBack={goBack} />
        <View style={styles.centerState}>
          <Mascot size={96} />
          <AnimoText variant="title" style={styles.centerText}>
            {t("detailV2.notFoundTitle")}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {errorMessage ?? t("detailV2.notFoundBody")}
          </AnimoText>
          <View style={styles.fullWidth}>
            <ChunkyButton
              label={t("detailV2.backToHarvest")}
              onPress={() => router.replace("/(farmer)/(tabs)/palengke")}
            />
          </View>
        </View>
      </View>
    );
  }

  const pendingCount = orderedRequests.length;
  const isDelete = confirmAction === "delete";

  const rejectCanSubmit = selectedReason !== null;
  const acceptValue = parseFloat(acceptQuantityText) || 0;
  const acceptMax = acceptingRequest ? acceptCap(acceptingRequest) : 0;
  const acceptMin = Math.min(QUANTITY_STEP_KG, acceptMax);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <V2BackHeader
        title={t("detailV2.title")}
        backLabel={t("common.back")}
        onBack={goBack}
        right={
          canEdit || canArchive || canDelete ? (
            <ListingOverflowButton onPress={() => setActionsOpen(true)} />
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + AnimoV2Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ListingDetailHeader listing={listing} photos={photos} />

        <SegmentedTabs
          tabs={[
            { key: "detalye", label: t("detailV2.tabDetails") },
            {
              key: "orders",
              label: `${t("detailV2.tabOrders")}${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "detalye" ? (
          <ListingDetailContent listing={listing} photos={photos} />
        ) : ordersLoading ? (
          <View style={styles.inlineCenter}>
            <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
          </View>
        ) : ordersError ? (
          <View style={styles.inlineCenter}>
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
              {ordersError}
            </AnimoText>
          </View>
        ) : (
          <View style={styles.ordersSection}>
            {staleAcceptNotice ? (
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
                {staleAcceptNotice}
              </AnimoText>
            ) : null}
            {orderedRequests.length === 0 ? (
              <OrdersEmptyState />
            ) : (
              orderedRequests.map((request) => (
                <PurchaseRequestCard
                  key={request.id}
                  request={request}
                  pricePerKg={listing.pricePerKg ?? 0}
                  buyerName={buyerNames.get(request.buyerId)}
                  trustStats={trustByBuyer.get(request.buyerId)}
                  onAccept={() => openAcceptModal(request)}
                  onReject={() => handleOpenReject(request)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ACCEPT: quantity confirmation (supports partial acceptance) */}
      <V2Dialog
        visible={acceptingRequest !== null}
        onClose={() => setAcceptingRequest(null)}
        icon={Check}
        iconTone="success"
        title={t("ordersV2.acceptTitle")}
        message={
          acceptingRequest
            ? t("ordersV2.acceptBody", { kg: acceptingRequest.requestedQuantityKg })
            : undefined
        }
        actions={
          <>
            <ChunkyButton label={t("ordersV2.accept")} onPress={handleConfirmAccept} />
            <ChunkyButton
              variant="secondary"
              label={t("detailV2.notNow")}
              onPress={() => setAcceptingRequest(null)}
            />
          </>
        }>
        <QuantityStepper
          value={acceptValue}
          decrementLabel={t("ordersV2.decrease")}
          incrementLabel={t("ordersV2.increase")}
          decrementDisabled={acceptValue <= acceptMin}
          incrementDisabled={acceptValue >= acceptMax}
          onDecrement={() =>
            setAcceptQuantityText(
              String(Math.max(acceptMin, acceptValue - QUANTITY_STEP_KG)),
            )
          }
          onIncrement={() =>
            setAcceptQuantityText(
              String(Math.min(acceptMax, acceptValue + QUANTITY_STEP_KG)),
            )
          }
        />
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
          {t("ordersV2.acceptTotal", {
            amount: formatPeso(acceptValue * (listing.pricePerKg ?? 0)),
          })}
        </AnimoText>
        {acceptError ? (
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {acceptError}
          </AnimoText>
        ) : null}
      </V2Dialog>

      <V2Dialog
        visible={acceptedRequest !== null}
        onClose={() => setAcceptedRequest(null)}
        icon={Check}
        iconTone="success"
        title={t("ordersV2.acceptedTitle")}
        message={
          acceptedRequest
            ? t("ordersV2.acceptedBody", { kg: acceptedRequest.requestedQuantityKg })
            : undefined
        }
        actions={
          <>
            <ChunkyButton
              label={t("ordersV2.viewInTx")}
              onPress={() => {
                setAcceptedRequest(null);
                router.push("/(farmer)/(tabs)/transaksyon");
              }}
            />
            <ChunkyButton
              variant="secondary"
              label={t("ordersV2.thanks")}
              onPress={() => setAcceptedRequest(null)}
            />
          </>
        }
      />

      {/* REJECT: reason prompt. Reason is farmer-intent-only UI; no `purchaserequest` column stores it. */}
      <V2Dialog
        visible={rejectingRequest !== null}
        onClose={() => setRejectingRequest(null)}
        icon={TriangleAlert}
        iconTone="warning"
        title={t("ordersV2.rejectTitle")}
        message={t("ordersV2.rejectBody")}
        actions={
          <>
            <ChunkyButton
              variant="danger"
              icon={X}
              label={t("ordersV2.rejectConfirm")}
              disabled={!rejectCanSubmit}
              onPress={handleConfirmReject}
            />
            <ChunkyButton
              variant="secondary"
              label={t("ordersV2.back")}
              onPress={() => setRejectingRequest(null)}
            />
          </>
        }>
        <View style={styles.reasonList} accessibilityRole="radiogroup">
          {REJECTION_REASONS.map((reason) => (
            <OptionCard
              key={reason.key}
              label={t(reason.label)}
              selected={selectedReason === reason.key}
              onPress={() => setSelectedReason(reason.key)}
            />
          ))}
        </View>
        {selectedReason === "other" ? (
          <TextField
            label={t("ordersV2.reasonOtherLabel")}
            placeholder={t("ordersV2.reasonOtherPlaceholder")}
            value={customReasonNote}
            onChangeText={setCustomReasonNote}
            multiline
          />
        ) : null}
      </V2Dialog>

      <V2Dialog
        visible={rejectSuccessVisible}
        onClose={() => setRejectSuccessVisible(false)}
        icon={Info}
        iconTone="neutral"
        title={t("ordersV2.rejectedTitle")}
        message={t("ordersV2.rejectedBody")}
        actions={
          <ChunkyButton
            label={t("modal.understood")}
            onPress={() => setRejectSuccessVisible(false)}
          />
        }
      />

      <ListingActionsSheet
        visible={actionsOpen}
        canEdit={canEdit}
        canArchive={canArchive}
        canDelete={canDelete}
        onEdit={() => {
          setActionsOpen(false);
          if (id)
            router.push({
              pathname: "/(farmer)/edit-listing" as any,
              params: { id },
            });
        }}
        onArchive={() => {
          setActionsOpen(false);
          setActionError(undefined);
          setConfirmAction("archive");
        }}
        onDelete={() => {
          setActionsOpen(false);
          setActionError(undefined);
          setConfirmAction("delete");
        }}
        onClose={() => setActionsOpen(false)}
      />

      <V2Dialog
        visible={confirmAction !== null}
        onClose={() => !actionBusy && setConfirmAction(null)}
        dismissable={!actionBusy}
        icon={isDelete ? Trash2 : Archive}
        iconTone={isDelete ? "danger" : "success"}
        title={isDelete ? t("detailV2.deleteTitle") : t("detailV2.archiveTitle")}
        message={isDelete ? t("detailV2.deleteBody") : t("detailV2.archiveBody")}
        actions={
          <>
            <ChunkyButton
              variant={isDelete ? "danger" : "primary"}
              icon={isDelete ? Trash2 : Archive}
              label={isDelete ? t("detailV2.delete") : t("detailV2.archive")}
              loading={actionBusy}
              onPress={handleConfirmListingAction}
            />
            <ChunkyButton
              variant="secondary"
              label={t("detailV2.notNow")}
              disabled={actionBusy}
              onPress={() => setConfirmAction(null)}
            />
          </>
        }>
        {actionError ? (
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {actionError}
          </AnimoText>
        ) : null}
      </V2Dialog>

      <V2Dialog
        visible={actionSuccess !== null}
        onClose={() => {
          setActionSuccess(null);
          router.replace("/(farmer)/(tabs)/palengke");
        }}
        icon={Check}
        iconTone="success"
        title={
          actionSuccess === "delete"
            ? t("detailV2.deletedTitle")
            : t("detailV2.archivedTitle")
        }
        message={
          actionSuccess === "delete"
            ? t("detailV2.deletedBody")
            : t("detailV2.archivedBody")
        }
        actions={
          <ChunkyButton
            label={t("detailV2.ok")}
            onPress={() => {
              setActionSuccess(null);
              router.replace("/(farmer)/(tabs)/palengke");
            }}
          />
        }
      />
    </View>
  );
}

function OrdersEmptyState() {
  const { t } = useLanguage();
  return (
    <View style={styles.empty}>
      <Mascot size={96} />
      <AnimoText variant="heading" style={styles.centerText}>
        {t("ordersV2.emptyTitle")}
      </AnimoText>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
        {t("ordersV2.emptyBody")}
      </AnimoText>
    </View>
  );
}

function PurchaseRequestCard({
  request,
  pricePerKg,
  trustStats,
  buyerName,
  onAccept,
  onReject,
}: {
  request: PurchaseRequest;
  pricePerKg: number;
  trustStats?: BuyerTrustStats;
  buyerName?: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useLanguage();
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
    <DepthCard style={styles.requestCard}>
      <View style={styles.requestTopRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("ordersV2.viewProfile")}
          hitSlop={8}
          onPress={openBuyerProfile}>
          <IconTile icon={UserRound} tone="success" />
        </Pressable>
        <View style={styles.requestInfo}>
          <View style={styles.requestInfoTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("ordersV2.viewProfile")}
              hitSlop={8}
              onPress={openBuyerProfile}
              style={styles.flex}>
              <AnimoText variant="bodyStrong" numberOfLines={1}>
                {buyerName || t("ordersV2.buyerUnavailable")}
              </AnimoText>
            </Pressable>
            <AnimoText variant="bodyStrong">{request.requestedQuantityKg} kg</AnimoText>
          </View>
          <View style={styles.requestInfoTop}>
            <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
              {formatPeso(request.requestedQuantityKg * pricePerKg)}
            </AnimoText>
            {request.status !== "Pending" ? (
              <StatusPill tone="neutral" label={request.status} />
            ) : null}
          </View>
        </View>
      </View>

      {trustStats ? (
        <BuyerTrustStatsCard stats={trustStats} onPressProfile={openBuyerProfile} />
      ) : null}

      {request.status === "Pending" ? (
        <View style={styles.requestActions}>
          <ChunkyButton
            variant="secondary"
            icon={X}
            label={t("ordersV2.reject")}
            onPress={onReject}
            style={styles.flex}
          />
          <ChunkyButton
            icon={Check}
            label={t("ordersV2.accept")}
            onPress={onAccept}
            style={styles.flex}
          />
        </View>
      ) : null}
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  scrollContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    gap: AnimoV2Spacing.lg,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: AnimoV2Spacing.lg,
    paddingHorizontal: AnimoV2Spacing.xl,
  },
  inlineCenter: { alignItems: "center", paddingVertical: AnimoV2Spacing.xl },
  centerText: { textAlign: "center" },
  fullWidth: { width: "100%" },
  flex: { flex: 1 },
  ordersSection: { gap: AnimoV2Spacing.lg },
  empty: {
    alignItems: "center",
    gap: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.xxl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  requestCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  requestTopRow: { flexDirection: "row", alignItems: "center", gap: AnimoV2Spacing.md },
  requestInfo: { flex: 1, gap: 2 },
  requestInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: AnimoV2Spacing.sm,
  },
  requestActions: { flexDirection: "row", gap: AnimoV2Spacing.md },
  reasonList: { gap: AnimoV2Spacing.sm },
});
