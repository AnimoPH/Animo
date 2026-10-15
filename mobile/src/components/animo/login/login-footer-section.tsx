import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { LegalModal } from '@/components/animo/legal-modal';
import { AnimoLoginColors, AnimoSpacing } from '@/constants/animo';
import type { LegalTabKey } from '@/constants/legal-content';
import { useLanguage } from '@/hooks/use-language';

/** Terms copy on the dark-green login card footer. Links open the legal modal. */
export function LoginFooterSection() {
  const { t } = useLanguage();
  const [legalTab, setLegalTab] = useState<LegalTabKey | null>(null);

  return (
    <View style={styles.wrap}>
      <AnimoText variant="tag" color={AnimoLoginColors.linkOnGreen} style={styles.text}>
        {t('login.termsPrefix')}{' '}
        <AnimoText
          variant="tag"
          color={AnimoLoginColors.linkOnGreen}
          style={styles.link}
          onPress={() => setLegalTab('terms')}>
          {t('login.termsOfService')}
        </AnimoText>{' '}
        {t('login.termsAnd')}{' '}
        <AnimoText
          variant="tag"
          color={AnimoLoginColors.linkOnGreen}
          style={styles.link}
          onPress={() => setLegalTab('privacy')}>
          {t('login.privacyPolicy')}
        </AnimoText>
        .
      </AnimoText>

      <LegalModal
        visible={legalTab !== null}
        initialTab={legalTab ?? 'terms'}
        onClose={() => setLegalTab(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AnimoSpacing.sm,
    paddingTop: AnimoSpacing.sm,
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    opacity: 0.82,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
