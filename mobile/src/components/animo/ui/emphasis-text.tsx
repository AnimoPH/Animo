import { AnimoText, type AnimoTextProps } from '@/components/animo/animo-text';
import { AnimoV2Colors } from '@/constants/animo';

/** Durations such as "48 oras", "2 araw", "3 hours", "1 week". */
const DURATION = /(\d+(?:[.,]\d+)?\s*(?:oras|araw|linggo|minuto|hours?|hrs?|days?|weeks?|minutes?|mins?))/gi;

/**
 * Renders text with every duration ("48 oras", "2 araw"...) in bold black so the
 * time window stands out from the surrounding secondary-colored sentence.
 */
export function EmphasisText({ children, ...rest }: Omit<AnimoTextProps, 'children'> & { children: string }) {
  const parts = children.split(DURATION);
  return (
    <AnimoText {...rest}>
      {parts.map((part, i) =>
        // split() with a capture group puts the matches at odd indexes.
        i % 2 === 1 ? (
          <AnimoText key={i} variant="bodyStrong" color={AnimoV2Colors.textPrimary}>
            {part}
          </AnimoText>
        ) : (
          part
        ),
      )}
    </AnimoText>
  );
}
