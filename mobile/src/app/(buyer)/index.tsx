import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, ReceiptText, ShoppingBag } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { ListingCard } from '@/components/animo/listing-card';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { LISTINGS } from '@/constants/marketplace';

/** Tahanan — buyer home: welcome, quick actions, and featured listings. */
export default function BuyerHomeScreen() {
  const featured = LISTINGS.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AnimoText variant="display" color={AnimoColors.black}>
            Kumusta, Mamimili!
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Maghanap ng de-kalidad na palay mula sa mga lokal na magsasaka sa patas na presyo.
          </AnimoText>
        </View>

        <View style={styles.actions}>
          <QuickAction
            icon={<ShoppingBag size={22} color={AnimoColors.green} />}
            label="Palengke"
            hint="Tingnan ang mga listing"
            onPress={() => router.push('/(buyer)/palengke')}
          />
          <QuickAction
            icon={<ReceiptText size={22} color={AnimoColors.green} />}
            label="Transaksyon"
            hint="Bantayan ang mga order"
            onPress={() => router.push('/(buyer)/transaksyon')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <AnimoText variant="h2" color={AnimoColors.black}>
            Mga Rekomendasyon
          </AnimoText>
          <Pressable onPress={() => router.push('/(buyer)/palengke')} hitSlop={8}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
              Lahat
            </AnimoText>
          </Pressable>
        </View>

        <View style={styles.featured}>
          {featured.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={() => router.push(`/(buyer)/palengke/${listing.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.flex}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {label}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {hint}
        </AnimoText>
      </View>
      <ChevronRight size={18} color={AnimoColors.muted} />
    </Pressable>
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
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.xl,
  },
  hero: {
    gap: AnimoSpacing.sm,
  },
  actions: {
    gap: AnimoSpacing.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
  },
  pressed: {
    opacity: 0.95,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featured: {
    gap: AnimoSpacing.lg,
    marginTop: -AnimoSpacing.sm,
  },
});
