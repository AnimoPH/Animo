import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoLoginColors, AnimoSpacing } from '@/constants/animo';

/** Terms copy on the dark-green login card footer. Links are styled only (no navigation). */
export function LoginFooterSection() {
  return (
    <View style={styles.wrap}>
      <AnimoText variant="caption" color={AnimoLoginColors.linkOnGreen} style={styles.text}>
        Sa pagpapatuloy, sumasang-ayon kayo sa aming{' '}
        <AnimoText variant="caption" color={AnimoLoginColors.linkOnGreen} style={styles.link}>
          Terms of Service
        </AnimoText>{' '}
        at{' '}
        <AnimoText variant="caption" color={AnimoLoginColors.linkOnGreen} style={styles.link}>
          Privacy Policy
        </AnimoText>
        .
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    paddingVertical: AnimoSpacing.sm,
  },
});
