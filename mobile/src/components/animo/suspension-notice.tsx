import { ShieldAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';

/**
 * Shown on the home screens while the LGU has the account suspended. A suspended
 * account can still look at its listings and transactions, but cannot start anything
 * new, so this says that, and why.
 */
export function SuspensionNotice() {
  const { account } = useSession();
  const { isTagalog } = useLanguage();
  if (account?.accountStatus !== 'Suspended') return null;

  const reason = account.suspensionReason;

  return (
    <View style={styles.card} accessibilityRole="alert">
      <ShieldAlert size={22} color={AnimoColors.danger} />
      <View style={styles.text}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.danger}>
          {isTagalog ? 'Na-suspend ang iyong account' : 'Your account is suspended'}
        </AnimoText>
        {reason ? (
          <AnimoText variant="body" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? `Dahilan: ${reason}` : `Reason: ${reason}`}
          </AnimoText>
        ) : null}
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          {isTagalog
            ? 'Makikita mo pa rin ang iyong mga listing at transaksyon, pero hindi ka makakagawa ng bago hanggang maibalik ng LGU ang iyong account. Makipag-ugnayan sa LGU.'
            : 'You can still see your listings and transactions, but you cannot start anything new until the LGU restores your account. Contact the LGU.'}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
    padding: AnimoSpacing.md,
    marginBottom: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.danger,
    backgroundColor: AnimoColors.dangerTint,
  },
  text: { flex: 1, gap: 4 },
});
