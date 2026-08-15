import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type PaymentMethodCardProps = {
  /** Masked account, e.g. "0917 •••• 567". */
  account: string;
  /** Explainer under the selected method. */
  note?: string;
};

/**
 * "Paraan ng Bayad" — the payment method picker.
 *
 * GCash is the only method for now, so it renders pre-selected rather than as a
 * real choice; add options here when more are supported.
 */
export function PaymentMethodCard({
  account,
  note = 'Ligtas na bayad sa pamamagitan ng GCash. Awtomatikong ila-lock sa escrow.',
}: PaymentMethodCardProps) {
  return (
    <View style={styles.card}>
      <AnimoText variant="h3" color={AnimoColors.black}>
        Paraan ng Bayad
      </AnimoText>

      <View style={styles.method}>
        <View style={styles.radio}>
          <View style={styles.radioCore} />
        </View>

        <View style={styles.logo}>
          <AnimoText variant="tag" color={AnimoColors.white}>
            GCash
          </AnimoText>
        </View>

        <View style={styles.methodText}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            GCash
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {account}
          </AnimoText>
        </View>

        <Check size={18} color={AnimoColors.green} strokeWidth={3} />
      </View>

      <AnimoText variant="caption" color={AnimoColors.muted}>
        {note}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderWidth: 1.5,
    borderColor: AnimoColors.green,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AnimoColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.green,
  },
  logo: {
    backgroundColor: '#0B76D1',
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  methodText: {
    flex: 1,
    gap: 1,
  },
});
