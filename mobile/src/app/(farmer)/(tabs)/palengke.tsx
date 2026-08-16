import { router, useFocusEffect } from "expo-router";
import { ImageIcon, Plus, Scale } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimoText } from "@/components/animo/animo-text";
import { AppHeader } from "@/components/animo/app-header";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { fetchMyCropListings } from "@/services/crop-listing-service";
import {
  STATUS_LABELS,
  varietyLabel,
  type CropListing,
  type ListingStatus,
} from "@/types/crop-listing";

type FilterKey = "Lahat" | Extract<ListingStatus, "Available" | "Sold_Out" | "Cancelled">;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "Lahat", label: "Lahat" },
  { key: "Available", label: STATUS_LABELS.Available },
  { key: "Sold_Out", label: STATUS_LABELS.Sold_Out },
  { key: "Cancelled", label: STATUS_LABELS.Cancelled },
];

const STATUS_BADGE_COLORS: Record<ListingStatus, string> = {
  Draft: AnimoColors.objectLowEmphasis,
  Available: AnimoColors.accentPrimary,
  Sold_Out: AnimoColors.objectLowEmphasis,
  Cancelled: AnimoColors.caution,
};

/** Palengke — farmer's own listings, fetched live from `croplisting` (own rows only, per RLS). */
export default function FarmerPalengkeScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("Lahat");
  const [listings, setListings] = useState<CropListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Guards against overlapping fetches (e.g. two focus events in quick
  // succession) applying their result out of order — only the response for
  // the most recently started load() is allowed to update state.
  const latestRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    setErrorMessage(undefined);
    try {
      const result = await fetchMyCropListings();
      if (latestRequestId.current === requestId) setListings(result);
    } catch (err) {
      if (latestRequestId.current === requestId) {
        setErrorMessage(
          err instanceof Error ? err.message : "Hindi ma-load ang mga listing.",
        );
      }
    } finally {
      if (latestRequestId.current === requestId) setLoading(false);
    }
  }, []);

  // Re-fetch every time this tab gains focus so a listing just created
  // ("Tignan ang Palengke" from the result screen) shows up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered =
    activeFilter === "Lahat"
      ? listings
      : listings.filter((l) => l.status === activeFilter);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppHeader onPressBell={() => console.log("Bell pressed")} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter) => (
          <FilterPill
            key={filter.key}
            label={filter.label}
            active={activeFilter === filter.key}
            onPress={() => setActiveFilter(filter.key)}
          />
        ))}
      </ScrollView>

      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={AnimoColors.accentPrimary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <AnimoText
              variant="body"
              color={AnimoColors.danger}
              style={styles.centerText}
            >
              {errorMessage}
            </AnimoText>
            <Pressable onPress={load}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
                Subukan ulit
              </AnimoText>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerState}>
            <AnimoText
              variant="body"
              color={AnimoColors.textMediumEmphasis}
              style={styles.centerText}
            >
              {listings.length === 0
                ? "Wala ka pang listing. Gumawa ng una mong listing ng palay."
                : "Walang listing sa filter na ito."}
            </AnimoText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => <ListingCard listing={item} />}
          />
        )}

        <Pressable
          onPress={() => router.push("/(farmer)/creation-listing")}
          style={[styles.fab, styles.fabShadow]}
          accessibilityLabel="Gumawa ng bagong listing"
        >
          <Plus size={28} color={AnimoColors.objectHighEmphasisInverse} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
    >
      <AnimoText
        variant="caption"
        color={
          active
            ? AnimoColors.textHighEmphasisInverse
            : AnimoColors.textMediumEmphasis
        }
      >
        {label}
      </AnimoText>
    </Pressable>
  );
}

function ListingCard({ listing }: { listing: CropListing }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/(farmer)/listing-detail",
          params: { id: listing.id },
        })
      }
      style={[styles.card, styles.shadow]}
    >
      <View style={styles.photoArea}>
        <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_BADGE_COLORS[listing.status] },
          ]}
        >
          <AnimoText variant="tag" color={AnimoColors.textHighEmphasisInverse}>
            {STATUS_LABELS[listing.status]}
          </AnimoText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
          {varietyLabel(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {listing.pricePerKg !== null
              ? `${formatPeso(listing.pricePerKg)} bawat kilo`
              : "Kinakalkula ang presyo"}
          </AnimoText>
          <View style={styles.remaining}>
            <Scale size={12} color={AnimoColors.textLowEmphasis} />
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              {" "}
              Remaining: {listing.remainingQuantityKg} kg
            </AnimoText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  filterScroll: {
    flexGrow: 0,
    marginTop: AnimoSpacing.md,
  },
  filterRow: {
    paddingHorizontal: AnimoSpacing.lg,
  },
  pill: {
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    marginRight: AnimoSpacing.sm,
  },
  pillActive: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  pillInactive: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  listContainer: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  listContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  centerText: {
    textAlign: "center",
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginBottom: AnimoSpacing.md,
    overflow: "hidden",
  },
  photoArea: {
    width: "100%",
    aspectRatio: 2.5,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: AnimoSpacing.sm,
    right: AnimoSpacing.sm,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  cardBody: {
    padding: AnimoSpacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: AnimoSpacing.xs,
  },
  remaining: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: AnimoSpacing.xl,
    right: AnimoSpacing.xl,
    width: 56,
    height: 56,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabShadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
