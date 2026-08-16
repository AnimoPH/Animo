import { CalendarDays, Clock, Users } from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import {
  BARANGAY_ADVISORIES,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  type BarangayAdvisory,
  type Severity,
} from '@/constants/dashboard';

export type AdvisoryPageProps = {
  onSignOut: () => void;
};

const SEVERITY_ORDER: Severity[] = ['severe', 'moderate', 'mild', 'clear'];

/**
 * Advisory monitoring — current advisory status per barangay.
 */
export function AdvisoryPage({ onSignOut }: AdvisoryPageProps) {
  const activeCount = BARANGAY_ADVISORIES.filter(
    (item) => item.status === 'active',
  ).length;

  return (
    <ConsoleLayout
      title="Pagsubaybay sa Payo"
      subtitle="Advisory Monitoring · Kasalukuyang katayuan kada barangay"
      onSignOut={onSignOut}>
      <div style={styles.toolbar}>
        <span style={styles.rangePill}>
          <CalendarDays size={16} color="var(--animo-black-secondary)" />
          Okt 6 – Okt 12, 2025
        </span>
      </div>

      <section style={styles.summaryRow}>
        {SEVERITY_ORDER.map((severity) => {
          const count = BARANGAY_ADVISORIES.filter(
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
                {SEVERITY_LABEL[severity]}
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
            <h2 style={styles.panelTitle}>Katayuan ng Payo kada Barangay</h2>
            <p style={styles.panelSubtitle}>Advisory status by barangay</p>
          </div>
          <span style={styles.activeBadge}>{activeCount} aktibo</span>
        </div>

        <div style={styles.advisoryList}>
          {BARANGAY_ADVISORIES.map((item) => (
            <AdvisoryRow key={item.barangay} item={item} />
          ))}
        </div>
      </article>
    </ConsoleLayout>
  );
}

function AdvisoryRow({ item }: { item: BarangayAdvisory }) {
  const isActive = item.status === 'active';

  return (
    <div
      style={{
        ...styles.advisoryCard,
        ...(isActive ? styles.advisoryCardActive : null),
      }}>
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
          {item.total} magsasaka
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', justifyContent: 'flex-end' },
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
  activeBadge: {
    padding: '5px 14px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
  },
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
  advisoryCardActive: {
    borderColor: 'var(--animo-green)',
    background: 'var(--animo-green-tint)',
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
