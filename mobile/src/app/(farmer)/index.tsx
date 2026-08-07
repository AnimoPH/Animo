import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, PlusCircle, ReceiptText, Sprout } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';

/** Tahanan — farmer home: greeting, earnings snapshot, quick actions. */
export default function FarmerHomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AnimoText variant="display" color={AnimoColors.black}>
            Kumusta, Magsasaka!
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Ilista ang inyong ani at maabot ang mga verified na mamimili sa patas na presyo.
          </AnimoText>
        </View>

        {/* Earnings snapshot */}
        <View style={styles.earningsCard}>
          <AnimoText variant="body" color={AnimoColors.white}>
            Kita ngayong buwan
          </AnimoText>
          <AnimoText variant="display" color={AnimoColors.white}>
            {formatPeso(12400)}
          </AnimoText>
          <AnimoText variant="caption" color="#D6E8D7">
            Mula sa 3 natapos na transaksyon
          </AnimoText>
        </View>

        <View style={styles.actions}>
          <QuickAction
            icon={<PlusCircle size={22} color={AnimoColors.green} />}
            label="Magdagdag ng Ani"
            hint="Gumawa ng bagong listing"
            onPress={() => router.push('/(farmer)/listings')}
          />
          <QuickAction
            icon={<Sprout size={22} color={AnimoColors.green} />}
            label="Aking Ani"
            hint="Pamahalaan ang mga listing"
            onPress={() => router.push('/(farmer)/listings')}
          />
          <QuickAction
            icon={<ReceiptText size={22} color={AnimoColors.green} />}
            label="Transaksyon"
            hint="Bantayan ang mga benta"
            onPress={() => router.push('/(farmer)/transaksyon')}
          />
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
  earningsCard: {
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: 4,
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
});
