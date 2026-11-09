import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimoV2Status, type StatusTone } from '@/constants/animo';

export type IconTileProps = {
  icon: LucideIcon;
  tone?: StatusTone;
  /** 36 (sm), 48 (default) or custom. */
  size?: number;
  /** Solid fill with a white icon (big advisory / dialog icons). */
  solid?: boolean;
  shape?: 'circle' | 'rounded';
};

/** Tinted icon container used in cards, rows and stat tiles. */
export function IconTile({ icon: Icon, tone = 'success', size = 48, solid = false, shape = 'circle' }: IconTileProps) {
  const t = AnimoV2Status[tone];
  // Warning solid (yellow) needs dark ink for contrast.
  const solidFg = tone === 'warning' ? '#1C1B18' : '#FFFFFF';
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? size / 2 : 20,
        backgroundColor: solid ? t.solid : t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={Math.round(size * 0.5)} color={solid ? solidFg : t.fg} strokeWidth={solid ? 2.75 : 2.25} />
    </View>
  );
}
