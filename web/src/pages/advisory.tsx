import { CalendarDays, Clock, Info, Users } from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { useLanguage } from '@/hooks/use-language';
import {
  getBarangayAdvisories,
  SEVERITY_COLOR,
  type BarangayAdvisory,
  type Severity,
} from '@/constants/dashboard';

export type AdvisoryPageProps = {
  onSignOut: () => void;
};

const SEVERITY_ORDER: Severity[] = ['severe', 'moderate', 'mild', 'clear'];

function formatCurrentWeekRange(isTagalog: boolean): string {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const startStr = now.toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = nextWeek.toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

/**
 * Advisory monitoring — advisory monitoring per barangay (Prototype Sample Feed).
 */
export function AdvisoryPage({ onSignOut }: AdvisoryPageProps) {
  const { t, language, isTagalog } = useLanguage();
  const advisories = getBarangayAdvisories(language);
  const activeCount = advisories.filter(
    (item) => item.status === 'active',
  ).length;

  const severityLabels: Record<Severity, string> = {
    severe: t('advisory.severitySevere'),
    moderate: t('advisory.severityModerate'),
    mild: t('advisory.severityMild'),
    clear: t('advisory.severityClear'),
  };

  const currentRange = formatCurrentWeekRange(isTagalog);

  return (
    <ConsoleLayout
      title={t('advisory.title')}
      subtitle={t('advisory.subtitle')}
      onSignOut={onSignOut}>
      <div style={styles.toolbar}>
        <div style={styles.sampleBadge}>
          <Info size={14} color="var(--animo-green)" />
          <span>
            {isTagalog
              ? 'Sample Feed · Naka-antabay sa LGU barangay read RPC'
              : 'Sample Feed · Pending LGU barangay read RPC'}
          </span>
        </div>
        <span style={styles.rangePill}>
          <CalendarDays size={16} color="var(--animo-black-secondary)" />
          {currentRange}
        </span>
      </div>

      <section style={styles.summaryRow}>
        {SEVERITY_ORDER.map((severity) => {
          const count = advisories.filter(
            (item) => item.severity === severity,
          ).length;
          return (
            <article
              key={severity}
              className="animo-card"
              style={styles.summaryCard}>
              <span style={styles.summaryHead}>
                <span
                  style={{
                    ...styles.severityDot,
                    background: SEVERITY_COLOR[severity],
                  }}
                />
                {severityLabels[severity]}
              </span>
              <span style={styles.summaryCount}>{count}</span>
              <span style={styles.summaryUnit}>barangay</span>
            </article>
          );
        })}
      </section>

      <article className="animo-card" style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.panelTitle}>{t('advisory.panelTitle')}</h2>
            <p style={styles.panelSubtitle}>{t('advisory.panelSubtitle')}</p>
          </div>
          <span style={styles.activeBadge}>
            {t('advisory.activeCount', { count: activeCount })}
          </span>
        </div>

        <div style={styles.advisoryList}>
          {advisories.map((item) => (
            <AdvisoryRow key={item.barangay} item={item} />
          ))}
        </div>
      </article>
    </ConsoleLayout>
  );
}

function AdvisoryRow({ item }: { item: BarangayAdvisory }) {
  const { t } = useLanguage();

  return (
    <div style={styles.advisoryCard}>
      <div style={styles.advisoryTop}>
        <span style={styles.advisoryName}>
          <span
            style={{
              ...styles.severityDot,
              background: SEVERITY_COLOR[item.severity],
            }}
          />
          {item.barangay}
        </span>
      </div>

      <div style={styles.advisoryHeadline}>{item.advisory}</div>

      <div style={styles.advisoryMeta}>
        <span style={styles.metaItem}>
          <Clock size={15} color="var(--animo-muted)" />
          {item.issued}
        </span>
        <span style={styles.metaItem}>
          <Users size={15} color="var(--animo-muted)" />
          {t('advisory.deliveredTo', { delivered: item.delivered, total: item.total })}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  sampleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 600,
  },
  rangePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 40,
    padding: '0 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    fontWeight: 600,
  },
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
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--animo-black-secondary)',
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 'var(--animo-radius-pill)',
    flexShrink: 0,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: '38px',
  },
  summaryUnit: {
    fontSize: 13,
    color: 'var(--animo-muted)',
  },
  panel: { padding: 24 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 20,
    borderBottom: '1px solid var(--animo-border)',
  },
  panelTitle: { fontSize: 20, fontWeight: 700 },
  panelSubtitle: {
    fontSize: 14,
    color: 'var(--animo-muted)',
    marginTop: 4,
  },
  activeBadge: {
    padding: '6px 14px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  advisoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 20,
  },
  advisoryCard: {
    border: '1px solid var(--animo-border)',
    borderRadius: 'var(--animo-radius-md)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  advisoryTop: { display: 'flex', alignItems: 'center', gap: 8 },
  advisoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 700,
    fontSize: 15,
  },
  advisoryHeadline: {
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    lineHeight: '20px',
  },
  advisoryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    fontSize: 13,
    color: 'var(--animo-muted)',
  },
  metaItem: { display: 'flex', alignItems: 'center', gap: 6 },
};
