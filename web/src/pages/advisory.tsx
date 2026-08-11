import { CalendarDays, Check, Clock, Users } from 'lucide-react';

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
 *
 * Farmer-response panels are intentionally out of scope, so this page tracks
 * issuance and delivery only.
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
          <CalendarDays size={15} color="var(--animo-black-secondary)" />
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
        <span
          style={{
            ...styles.statusBadge,
            ...(isActive ? styles.statusActive : styles.statusDone),
          }}>
          {isActive ? 'Aktibo' : 'Natapos'}
        </span>
      </div>

      <div style={styles.advisoryHeadline}>{item.advisory}</div>

      <div style={styles.advisoryMeta}>
        <span style={styles.metaItem}>
          <Clock size={14} color="var(--animo-muted)" />
          {item.issued}
        </span>
        <span style={styles.metaItem}>
          <Check size={14} color="var(--animo-green)" />
          {item.delivered}/{item.total} naipadala
        </span>
        <span style={styles.metaItem}>
          <Users size={14} color="var(--animo-muted)" />
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
    height: 36,
    padding: '0 14px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 18,
  },
  summaryHead: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  summaryCount: { fontSize: 28, fontWeight: 700, lineHeight: '34px' },
  summaryUnit: { fontSize: 11, color: 'var(--animo-muted)' },
  panel: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  panelSubtitle: { margin: 0, fontSize: 12, color: 'var(--animo-black-secondary)' },
  activeBadge: {
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 11,
    fontWeight: 600,
  },
  advisoryList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 12,
  },
  advisoryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 16,
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
    fontSize: 15,
    fontWeight: 600,
  },
  severityDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  statusActive: {
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    border: '1px solid var(--animo-green)',
  },
  statusDone: {
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
  },
  advisoryHeadline: { fontSize: 13, color: 'var(--animo-black-secondary)' },
  advisoryMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    fontSize: 12,
    color: 'var(--animo-black-secondary)',
  },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
};
