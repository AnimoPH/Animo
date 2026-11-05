import { Image } from 'expo-image';
import { View } from 'react-native';

import { AnimoV2Colors } from '@/constants/animo';

export type MascotProps = {
  size?: number;
  /** The icon art is white, so it sits on a green tile by default. */
  tile?: boolean;
};

/** The Animo app icon (white salakot face). Greets on Tahanan, appears on empty states and success screens. */
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
        source={require('@/assets/images/animo/icon-white.png')}
        style={{ width: size * 0.86, height: size * 0.86 }}
        contentFit="contain"
      />
    </View>
  );
}
