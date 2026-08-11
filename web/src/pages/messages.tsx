import { CheckCheck, CloudDrizzle, CloudSun, TrendingUp } from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import {
  DELIVERY_CHANNELS,
  TRIGGER_ALERTS,
  TRIGGER_SUMMARY,
  type AlertKind,
  type TriggerAlert,
} from '@/constants/dashboard';

export type MessagesPageProps = {
  onSignOut: () => void;
};

/** Icon + tint per alert kind. */
const ALERT_STYLE: Record<
  AlertKind,
  { icon: typeof CloudDrizzle; tint: string; color: string; badge: React.CSSProperties }
> = {
  severe: {
    icon: CloudDrizzle,
    tint: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
    badge: { background: 'var(--animo-danger-tint)', color: 'var(--animo-danger)' },
  },
  moderate: {
    icon: CloudDrizzle,
    tint: 'var(--animo-warning-tint)',
    color: 'var(--animo-warning)',
    badge: { background: 'var(--animo-warning-tint)', color: '#9A5F12' },
  },
  mild: {
    icon: CloudDrizzle,
    tint: 'var(--animo-caution-tint)',
    color: '#B8901A',
    badge: { background: 'var(--animo-caution-tint)', color: '#8A6D12' },
  },
  done: {
    icon: CloudSun,
    tint: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    badge: { background: 'var(--animo-surface)', color: 'var(--animo-black-secondary)' },
  },
  price: {
    icon: TrendingUp,
    tint: '#E8F0FE',
    color: '#3B82F6',
    badge: { background: '#E8F0FE', color: '#2563EB' },
  },
};

/** Notification feed of automatic advisory and price triggers. */
export function MessagesPage({ onSignOut }: MessagesPageProps) {
  const unread = TRIGGER_ALERTS.filter((alert) => alert.unread).length;

  return (
    <ConsoleLayout
      title="Mensahe"
      subtitle="Notification · Mga trigger ng rain advisory"
      onSignOut={onSignOut}>
      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Rain Advisory Trigger Alerts</h2>
              <p style={styles.panelSubtitle}>Feed ng mga awtomatikong babala</p>
            </div>
            {unread > 0 ? (
              <span style={styles.unreadBadge}>{unread} bago</span>
            ) : null}
          </div>

          <div style={styles.alertList}>
            {TRIGGER_ALERTS.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        </article>

        <aside style={styles.sideColumn}>
          <article className="animo-card" style={styles.panel}>
            <div>
              <h2 style={styles.panelTitle}>Buod ng Trigger</h2>
              <p style={styles.panelSubtitle}>Okt 6 – Okt 12, 2025</p>
            </div>

            <ul style={styles.summaryList}>
              {TRIGGER_SUMMARY.map((row) => (
                <li key={row.label} style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>
                    <span style={{ ...styles.dot, background: row.color }} />
                    {row.label}
                  </span>
                  <span style={styles.summaryCount}>{row.count}</span>
                </li>
              ))}
            </ul>

            <div style={styles.divider} />

            <div>
              <h3 style={styles.sectionHeading}>Paraan ng pagpapadala</h3>
              <ul style={styles.channelList}>
                {DELIVERY_CHANNELS.map((channel) => (
                  <li key={channel.label} style={styles.channelRow}>
                    <span style={styles.channelLabel}>{channel.label}</span>
                    <span style={styles.channelValue}>{channel.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button type="button" style={styles.markRead}>
              <CheckCheck size={16} />
              Markahan lahat bilang nabasa
            </button>
          </article>
        </aside>
      </div>
    </ConsoleLayout>
  );
}

function AlertRow({ alert }: { alert: TriggerAlert }) {
  const tone = ALERT_STYLE[alert.kind];
  const Icon = tone.icon;

  return (
    <div style={styles.alertCard}>
      <span style={{ ...styles.alertIcon, background: tone.tint }}>
        <Icon size={18} color={tone.color} />
      </span>

      <div style={styles.alertBody}>
        <div style={styles.alertTop}>
          <span style={styles.alertTitle}>
            {alert.title}
            {alert.unread ? (
              <span style={{ ...styles.unreadDot, background: tone.color }} />
            ) : null}
          </span>
          <span style={{ ...styles.alertBadge, ...tone.badge }}>{alert.badge}</span>
        </div>

        <p style={styles.alertText}>{alert.body}</p>

        <div style={styles.alertFooter}>
          <span style={styles.alertTime}>{alert.time}</span>
          <button type="button" style={styles.detailLink}>
            Tingnan ang detalye
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 320px',
    gap: 16,
    alignItems: 'start',
  },
  sideColumn: { display: 'flex', flexDirection: 'column', gap: 16 },
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
  unreadBadge: {
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
    fontSize: 11,
    fontWeight: 600,
  },
  alertList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertCard: {
    display: 'flex',
    gap: 12,
    padding: 14,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  alertIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 'var(--animo-radius-pill)',
    flexShrink: 0,
  },
  alertBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 },
  alertTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 600,
  },
  unreadDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  alertBadge: {
    padding: '3px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  alertText: {
    margin: 0,
    fontSize: 13,
    lineHeight: '19px',
    color: 'var(--animo-black-secondary)',
  },
  alertFooter: { display: 'flex', alignItems: 'center', gap: 14 },
  alertTime: { fontSize: 12, color: 'var(--animo-muted)' },
  detailLink: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--animo-green)',
  },
  /**
   * Summary rows sit on one compact line each — the label and its count share a
   * baseline instead of each category getting an oversized block.
   */
  summaryList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid var(--animo-border)',
  },
  summaryLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  summaryCount: { fontSize: 15, fontWeight: 700 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  divider: { height: 1, background: 'var(--animo-border)' },
  sectionHeading: {
    margin: '0 0 8px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--animo-black)',
  },
  channelList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  channelLabel: { fontSize: 12, color: 'var(--animo-black-secondary)' },
  channelValue: { fontSize: 12, fontWeight: 600 },
  markRead: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-green)',
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    fontSize: 14,
    fontWeight: 600,
  },
};
