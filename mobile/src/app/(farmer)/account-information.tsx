import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChevronRight,
  Edit2,
  FileText,
  HelpCircle,
  Home,
  LandPlot,
  LogOut,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/animo/back-header';
import SignOutModal from '@/components/signout-modal';
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from '@/constants/animo';

const SCREEN_PADDING = AnimoSpacing.lg;

const SETTINGS_ROWS = [
  { icon: Bell, label: 'Notipikasyon' },
  { icon: HelpCircle, label: 'Tulong at FAQ' },
  { icon: FileText, label: 'Mga Tuntunin at Kundisyon' },
  { icon: ShieldCheck, label: 'Patakaran sa Privacy' },
] as const;

/**
 * Account Information — farmer personal fields and settings, opened from Profile.
 */
export default function AccountInformationScreen() {
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title="Account Information" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

      {/* SECTION 1 — Personal Fields Card */}
      <View style={styles.fieldsCard}>
        <View style={styles.fieldRow}>
          <UserRound size={20} color={AnimoColors.objectLowEmphasis} />
          <View style={styles.fieldCopy}>
            <Text style={styles.fieldLabel}>Buong Pangalan</Text>
            <Text style={styles.fieldValue}>Eric Lor</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => console.log('Edit Buong Pangalan')}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Edit2 size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldRow}>
          <Phone size={20} color={AnimoColors.objectLowEmphasis} />
          <View style={styles.fieldCopy}>
            <Text style={styles.fieldLabel}>Numero ng Telepono</Text>
            <Text style={styles.fieldValue}>+63 917 890 1234</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => console.log('Edit Numero ng Telepono')}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Edit2 size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>
        <View style={styles.divider} />

        <View style={styles.addressRow}>
          <Home size={20} color={AnimoColors.objectLowEmphasis} style={styles.addressIcon} />
          <View style={styles.fieldCopy}>
            <View>
              <Text style={styles.fieldLabel}>Adress</Text>
              <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="tail">
                129-E 12th Ave, San Jose...
              </Text>
            </View>
            <View style={styles.barangayBlock}>
              <Text style={styles.fieldLabel}>Baranggay</Text>
              <Text style={styles.fieldValue}>San Jose</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => console.log('Edit Address at Barangay')}
            style={({ pressed }) => [styles.addressEdit, pressed && styles.pressed]}>
            <Edit2 size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>
        <View style={styles.divider} />


        <View style={styles.fieldRow}>
          <LandPlot size={20} color={AnimoColors.objectLowEmphasis} />
          <View style={styles.fieldCopy}>
            <Text style={styles.fieldLabel}>Sukat ng Bukid</Text>
            <Text style={styles.fieldValue}>1.5 Ektarya</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => console.log('Edit Numero ng Telepono')}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Edit2 size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        </View>
      </View>

      {/* SECTION 2 — Mga Setting */}
      {/* <Text style={styles.sectionLabel}>Mga Setting</Text>
      <View style={styles.settingsCard}>
        {SETTINGS_ROWS.map(({ icon: Icon, label }, index) => (
          <View key={label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <Icon size={20} color={AnimoColors.objectHighEmphasis} />
              <Text style={styles.settingLabel}>{label}</Text>
              <ChevronRight size={16} color={AnimoColors.objectLowEmphasis} />
            </Pressable>
          </View>
        ))}
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowSignOutModal(true)}
          style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
          <LogOut size={20} color={AnimoColors.caution} />
          <Text style={styles.signOutLabel}>Mag-sign Out</Text>
        </Pressable>
      </View>
      <SignOutModal
        visible={showSignOutModal}
        onCancel={() => setShowSignOutModal(false)}
        onConfirm={() => {
          setShowSignOutModal(false);
          console.log('Sign out confirmed — wire auth logout here');
        }}
      /> */}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xxl,
  },
  fieldsCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.lg,
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fieldRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldCopy: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
  },
  fieldLabel: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
  },
  fieldValue: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
    marginTop: 2,
  },
  addressRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginTop: 2,
  },
  addressValue: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
    marginTop: 2,
  },
  barangayBlock: {
    marginTop: AnimoSpacing.sm,
  },
  addressEdit: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  sectionLabel: {
    ...AnimoType.h3,
    color: AnimoColors.textHighEmphasis,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.xl,
  },
  settingsCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.xxl,
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    ...AnimoType.body,
    color: AnimoColors.textHighEmphasis,
    marginLeft: AnimoSpacing.md,
    flex: 1,
  },
  signOutLabel: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.caution,
    marginLeft: AnimoSpacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  pressed: {
    opacity: 0.85,
  },
});
