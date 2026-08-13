import { router } from "expo-router";
import {
  AlertTriangle,
  Bell,
  Clock3,
  ImageIcon,
  Plus,
  ChevronRight,
} from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimoText } from "@/components/animo/animo-text";
import { AppHeader } from "@/components/animo/app-header";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";

type FilterKey = "Lahat" | "Naaprubahan" | "Naubos" | "Tinanggal";

const FILTERS: FilterKey[] = ["Lahat", "Naaprubahan", "Naubos", "Tinanggal"];

type ListingStatus = "Available" | "Not Pass" | "Naubos";

type Listing = {
  id: string;
  variety: string;
  price: string;
  remaining: string;
  status: ListingStatus;
  pendingCount: number;
  image?: ImageSourcePropType;
};

const LISTINGS: Listing[] = [
  {
    id: "1",
    variety: "Palay RC218",
    price: "₱25.00",
    remaining: "500 kg",
    status: "Available",
    pendingCount: 3,
    image: require("@/assets/images/animo/listing1.jpeg"),
  },
  {
    id: "2",
    variety: "Palay RIRI14",
    price: "₱19.00",
    remaining: "600 kg",
    status: "Not Pass",
    pendingCount: 0,
    image: require("@/assets/images/animo/listing2.jpg"),
  },
  {
    id: "3",
    variety: "Dinorado Blend",
    price: "₱22.00",
    remaining: "350 kg",
    status: "Available",
    pendingCount: 0,
    image: require("@/assets/images/animo/listing3.jpg"),
  },
];

const STATUS_BADGE_COLORS: Record<ListingStatus, string> = {
  Available: AnimoColors.accentPrimary,
  "Not Pass": AnimoColors.caution,
  Naubos: AnimoColors.objectLowEmphasis,
};

/** Palengke — farmer's own listings: status, price, pending orders, quality issues. */
export default function FarmerPalengkeScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("Lahat");

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
            key={filter}
            label={filter}
            active={activeFilter === filter}
            onPress={() => setActiveFilter(filter)}
          />
        ))}
      </ScrollView>

      <View style={styles.listContainer}>
        <FlatList
          data={LISTINGS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ListingCard listing={item} />}
        />

        <Pressable
          onPress={() => router.push("/(farmer)/palay-listing")}
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
  label: FilterKey;
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

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <View style={[styles.card, styles.shadow]}>
      <View style={styles.photoArea}>
        {listing.image ? (
          <Image
            source={listing.image}
            style={styles.photoImage}
            resizeMode="cover"
          />
        ) : (
          <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
        )}{" "}
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_BADGE_COLORS[listing.status] },
          ]}
        >
          <AnimoText variant="tag" color={AnimoColors.textHighEmphasisInverse}>
            {listing.status}
          </AnimoText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
          {listing.variety}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {listing.price} bawat kilo
          </AnimoText>
          <AnimoText
            variant="caption"
            color={AnimoColors.textLowEmphasis}
            style={styles.remaining}
          >
            Remaining: {listing.remaining}
          </AnimoText>
        </View>

        {listing.status === "Available" && listing.pendingCount > 0 ? (
          <>
            <View style={styles.divider} />
            <View style={styles.pendingRow}>
              <View style={styles.pendingLeft}>
                <Clock3 size={14} color={AnimoColors.moderate} />
                <AnimoText
                  variant="caption"
                  color={AnimoColors.moderate}
                  style={styles.pendingText}
                >
                  {listing.pendingCount} Pending Order
                </AnimoText>
              </View>

              <Pressable
                onPress={() =>
                  console.log("Tingnan ang pending orders pressed")
                }
              >
                <View style={styles.ctaTextWrap}>
                  <AnimoText
                    variant="caption"
                    color={AnimoColors.textLowEmphasis}
                  >
                    View
                  </AnimoText>
                  <ChevronRight size={18} color={AnimoColors.textLowEmphasis} />
                </View>
              </Pressable>
            </View>
          </>
        ) : null}

        {listing.status === "Not Pass" ? (
          <>
            <View style={styles.warningRow}>
              <AlertTriangle size={14} color={AnimoColors.moderate} />
              <AnimoText
                variant="caption"
                color={AnimoColors.moderate}
                style={styles.warningText}
              >
                May Naiulat na Isyu sa Kalidad
              </AnimoText>
            </View>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => console.log("Ayusin ang Issue pressed")}
              style={styles.issueButton}
            >
              <AnimoText
                variant="bodyEmphasis"
                color={AnimoColors.caution}
                style={styles.issueButtonText}
              >
                Ayusin ang Issue
              </AnimoText>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
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
  photoImage: {
    width: "100%",
    height: "100%",
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
    marginTop: AnimoSpacing.xs,
  },
  remaining: {
    alignSelf: "flex-end",
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: AnimoSpacing.sm,
  },
  divider: {
    // width: "100%",
    height: 1,
    opacity: 0.7,
    backgroundColor: AnimoColors.surfaceTertiary, // or AnimoColors.borderLowEmphasis
    marginTop: AnimoSpacing.md,
  },
  pendingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingText: {
    marginLeft: AnimoSpacing.xs,
  },
  ctaTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: AnimoSpacing.sm,
  },
  warningText: {
    marginLeft: AnimoSpacing.xs,
  },
  issueButton: {
    marginTop: AnimoSpacing.md,
    borderWidth: 1.5,
    borderColor: AnimoColors.caution,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  issueButtonText: {
    textAlign: "center",
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
