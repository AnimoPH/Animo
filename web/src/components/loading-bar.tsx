import { useLanguage } from '@/hooks/use-language';

export function LoadingBar() {
  const { t } = useLanguage();
  return <div className="animo-loading-bar" role="progressbar" aria-label={t('common.loading')} />;
}
