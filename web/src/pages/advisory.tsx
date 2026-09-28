import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Users } from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useLanguage } from '@/hooks/use-language';
import type { WebTranslationKey } from '@/i18n/translations';
import {
  fetchLguAdvisoryOverview,
  formatForecastTimestamp,
  formatRegisteredDate,
  type AdvisoryAction,
  type LguAdvisoryGroup,
  type LguAdvisoryOverview,
} from '@/services/lgu-console-service';

export type AdvisoryPageProps = {
  onSignOut: () => void;
};

const ACTION_ORDER: AdvisoryAction[] = ['Advance_Cut', 'Delayed_Harvest', 'No_Action_Needed'];

const ACTION_LABEL: Record<AdvisoryAction, WebTranslationKey> = {
  Advance_Cut: 'advisory.actionAdvanceCut',
  Delayed_Harvest: 'advisory.actionDelayedHarvest',
  No_Action_Needed: 'advisory.actionNoAction',
};

const ACTION_COLOR: Record<AdvisoryAction, string> = {
  Advance_Cut: 'var(--animo-danger)',
  Delayed_Harvest: 'var(--animo-warning)',
  No_Action_Needed: 'var(--animo-green)',
};

/**
 * Advisory monitoring — latest recommendation per barangay, from one shared
 * Antipolo forecast. Farmer counts are people who currently hold that
 * recommendation, not push-delivery totals.
 */
export function AdvisoryPage({ onSignOut }: AdvisoryPageProps) {
  const { t, isTagalog } = useLanguage();
  const [overview, setOverview] = useState<LguAdvisoryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadOverview() {
    setLoadError(null);
    return fetchLguAdvisoryOverview()
      .then(setOverview)
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : t('common.error'));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  useAutoRefresh(() => void loadOverview());

  const groups = overview?.groups ?? [];
  const counts = Object.fromEntries(
    ACTION_ORDER.map((action) => [
      action,
      groups.filter((group) => group.recommendedAction === action).reduce((sum, group) => sum + group.farmerCount, 0),
    ]),
  ) as Record<AdvisoryAction, number>;

  const forecastLabel = overview?.forecastFetchedAt
    ? formatForecastTimestamp(overview.forecastFetchedAt, isTagalog)
    : null;
  const rainAmount =
    overview?.precipitationMmH != null && Number.isFinite(overview.precipitationMmH)
      ? t('advisory.rainLine', { amount: overview.precipitationMmH.toFixed(1) })
      : null;

  return (
    <ConsoleLayout title={t('advisory.title')} subtitle={t('advisory.subtitle')} onSignOut={onSignOut}>
      <p style={styles.sharedNote}>{t('advisory.sharedForecast')}</p>

      <div style={styles.toolbar}>
        <span style={styles.rangePill}>
          <CalendarDays size={16} color="var(--animo-black-secondary)" />
          {forecastLabel ? (
            <>
              {rainAmount ? `${rainAmount} · ` : null}
              {forecastLabel}
              {overview?.rainExpected != null
                ? ` · ${overview.rainExpected ? t('advisory.rainExpected') : t('advisory.rainClear')}`
                : null}
              {overview?.isStale ? ` · ${t('advisory.staleForecast')}` : null}
            </>
          ) : (
            t('advisory.noForecast')
          )}
        </span>
      </div>

      {loading ? <p style={styles.notice}>{t('common.loading')}</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      <section style={styles.summaryRow}>
        {ACTION_ORDER.map((action) => (
          <article key={action} className="animo-card" style={styles.summaryCard}>
            <span style={styles.summaryHead}>
              <span style={{ ...styles.severityDot, background: ACTION_COLOR[action] }} />
              {t(ACTION_LABEL[action])}
            </span>
            <span style={styles.summaryCount}>{counts[action]}</span>
            <span style={styles.summaryUnit}>{t('advisory.farmerUnit')}</span>
          </article>
        ))}
      </section>

      <article className="animo-card" style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.panelTitle}>{t('advisory.panelTitle')}</h2>
            <p style={styles.panelSubtitle}>{t('advisory.panelSubtitle')}</p>
          </div>
        </div>

        {groups.length === 0 ? (
          <p style={styles.notice}>{t('advisory.empty')}</p>
        ) : (
          <div style={styles.advisoryList}>
            {groups.map((group) => (
              <AdvisoryRow key={`${group.barangay}-${group.recommendedAction}`} group={group} />
            ))}
          </div>
        )}
      </article>
    </ConsoleLayout>
  );
}

function AdvisoryRow({ group }: { group: LguAdvisoryGroup }) {
  const { t, isTagalog } = useLanguage();

  return (
    <div style={styles.advisoryCard}>
      <div style={styles.advisoryTop}>
        <span style={styles.advisoryName}>
          <span style={{ ...styles.severityDot, background: ACTION_COLOR[group.recommendedAction] }} />
          {group.barangay}
        </span>
      </div>

      <div style={styles.advisoryHeadline}>{t(ACTION_LABEL[group.recommendedAction])}</div>

      <div style={styles.advisoryMeta}>
        <span style={styles.metaItem}>
          <Clock size={15} color="var(--animo-muted)" />
          {t('advisory.issuedAt')} {group.latestIssued ? formatRegisteredDate(group.latestIssued, isTagalog) : t('common.none')}
        </span>
        <span style={styles.metaItem}>
          <Users size={15} color="var(--animo-muted)" />
          {t('advisory.farmersHolding', { count: group.farmerCount })}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sharedNote: {
    margin: 0,
    fontSize: 14,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  toolbar: { display: 'flex', justifyContent: 'flex-end' },
  rangePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    padding: '8px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    fontWeight: 600,
  },
  notice: { margin: 0, fontSize: 14, color: 'var(--animo-muted)' },
  errorNotice: { margin: 0, fontSize: 14, color: 'var(--animo-danger)' },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 18,
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 20,
  },
  summaryHead: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--animo-black-secondary)',
  },
  summaryCount: { fontSize: 32, fontWeight: 800, lineHeight: '38px' },
  summaryUnit: { fontSize: 13, color: 'var(--animo-muted)' },
  panel: { display: 'flex', flexDirection: 'column', gap: 18, padding: 24 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 20, fontWeight: 800 },
  panelSubtitle: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  advisoryList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 14,
  },
  advisoryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 18,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  advisoryTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  advisoryName: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  advisoryHeadline: { fontSize: 14, color: 'var(--animo-black-secondary)' },
  advisoryMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
};
