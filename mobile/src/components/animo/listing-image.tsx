import { Wheat } from 'lucide-react-native';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AnimoColors } from '@/constants/animo';

export type ListingImageProps = {
  /** Height of the image block. */
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * Placeholder for a listing photo.
 *
 * Real listings will show an uploaded rice photo; until those assets exist we
 * render a soft green tile with a wheat glyph so layouts are complete and there
 * are no missing-asset errors. Swap this for an <Image> when photos are wired.
 */
export function ListingImage({ height = 160, borderRadius = 0, style }: ListingImageProps) {
  return (
    <View style={[styles.block, { height, borderRadius }, style]}>
      <Wheat size={Math.min(64, height * 0.4)} color={AnimoColors.green} strokeWidth={1.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    backgroundColor: '#DCEBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
