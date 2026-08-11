import iconGreen from '@/assets/animo/icon-green.png';
import iconWhite from '@/assets/animo/icon-white.png';
import wordmarkWhite from '@/assets/animo/wordmark-white.png';

export type AnimoMarkProps = {
  /** Rendered size of the square logo tile, in px. */
  size?: number;
  /**
   * `light` — white tile with the green icon (for use on the brand green panel).
   * `green` — green tile with the white icon (for use on white surfaces).
   */
  tone?: 'light' | 'green';
};

/** The Animo logo tile — the rounded square holding the farmer icon. */
export function AnimoMark({ size = 44, tone = 'light' }: AnimoMarkProps) {
  const onGreenTile = tone === 'green';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: onGreenTile ? 'var(--animo-green)' : 'var(--animo-white)',
        flexShrink: 0,
      }}>
      <img
        src={onGreenTile ? iconWhite : iconGreen}
        alt="Animo"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          objectFit: 'contain',
        }}
      />
    </span>
  );
}

/** Intrinsic aspect ratio of the white lockup artwork (2780 × 775). */
const WORDMARK_RATIO = 2780 / 775;

export type AnimoWordmarkProps = {
  /** Rendered height of the lockup, in px. Width follows the artwork ratio. */
  height?: number;
};

/**
 * The full white ANIMO lockup — farmer icon plus the drawn wordmark, as a
 * single piece of artwork. For use on the brand green panel.
 */
export function AnimoWordmark({ height = 56 }: AnimoWordmarkProps) {
  return (
    <img
      src={wordmarkWhite}
      alt="Animo"
      style={{
        height,
        width: height * WORDMARK_RATIO,
        maxWidth: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
