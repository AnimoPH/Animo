import { Image } from 'expo-image';
import { View } from 'react-native';

import { AnimoV2Colors } from '@/constants/animo';

export type MascotProps = {
  size?: number;
  /** The mascot art is white line-work, so it sits on a green tile by default. */
  tile?: boolean;
};

/** The salakot mascot (greets on Tahanan, appears on empty states and success screens). */
export function Mascot({ size = 64, tile = true }: MascotProps) {
  return (
    <View
      accessible
      accessibilityLabel="Animo"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: tile ? AnimoV2Colors.surfaceBrand : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <Image
        source={require('@/assets/images/animo/animo-mascot.png')}
        style={{ width: size * 0.92, height: size * 0.92 }}
        contentFit="contain"
      />
    </View>
  );
}
