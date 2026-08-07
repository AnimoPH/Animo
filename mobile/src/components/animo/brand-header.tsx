import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';

/** Small "🌾 Animo" lockup shown at the top of onboarding screens. */
export function BrandHeader() {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Image
          source={require('@/assets/images/animo/icon-green.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
      <AnimoText variant="h2" color={AnimoColors.green}>
        Animo
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
});
