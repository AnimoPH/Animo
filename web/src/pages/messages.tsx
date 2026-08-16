import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  CloudDrizzle,
  CloudSun,
  Database,
  Gavel,
  MapPin,
  Send,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';

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
  nfa: {
    icon: Gavel,
    tint: '#EFF6FF',
    color: '#2563EB',
    badge: { background: '#EFF6FF', color: '#2563EB' },
  },
  psa: {
    icon: Database,
    tint: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    badge: { background: 'var(--animo-green-tint)', color: 'var(--animo-green)' },
  },
};

/** Notification feed of automatic advisory and price triggers with detailed interactive modal. */
export function MessagesPage({ onSignOut }: MessagesPageProps) {
  const [alerts, setAlerts] = useState(TRIGGER_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<TriggerAlert | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const unread = alerts.filter((alert) => alert.unread).length;

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
  };

  const handleOpenDetail = (alert: TriggerAlert) => {
    setSelectedAlert(alert);
    // Automatically mark this alert as read
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, unread: false } : a))
    );
  };

  const handleSendFollowUp = () => {
    setSelectedAlert(null);
    setToastMessage('Matagumpay na naipadala ang follow-up SMS broadcast sa mga rehistradong magsasaka.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <ConsoleLayout
      title="Mensahe"
      subtitle="Notification · Mga trigger ng rain advisory, NFA, at presyo"
      onSignOut={onSignOut}>
      {toastMessage && (
        <div style={styles.toast}>
          <Bell size={18} color="var(--animo-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Trigger Alerts & Notifications</h2>
              <p style={styles.panelSubtitle}>Feed ng mga awtomatikong babala at ulat</p>
            </div>
            {unread > 0 ? (
              <span style={styles.unreadBadge}>{unread} bago</span>
            ) : null}
          </div>

          <div style={styles.alertList}>
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onOpenDetail={() => handleOpenDetail(alert)}
              />
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

            <button type="button" onClick={handleMarkAllRead} style={styles.markRead}>
              <CheckCheck size={18} />
              Markahan lahat bilang nabasa
            </button>
          </article>
        </aside>
      </div>

      {/* Full Detail Modal */}
      {selectedAlert && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    ...styles.modalIconWrap,
                    background: ALERT_STYLE[selectedAlert.kind].tint,
                  }}>
                  {(() => {
                    const Icon = ALERT_STYLE[selectedAlert.kind].icon;
                    return <Icon size={22} color={ALERT_STYLE[selectedAlert.kind].color} />;
                  })()}
                </span>
                <div>
                  <h2 style={styles.modalTitle}>{selectedAlert.title}</h2>
                  <span style={{ ...styles.alertBadge, ...ALERT_STYLE[selectedAlert.kind].badge, marginTop: 4 }}>
                    {selectedAlert.badge}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                style={styles.closeBtn}>
                <X size={22} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.metaBox}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    <MapPin size={15} color="var(--animo-muted)" /> Lokasyon:
                  </span>
                  <span style={styles.metaValue}>{selectedAlert.barangay || 'San Mateo, Rizal'}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    <UserCheck size={15} color="var(--animo-muted)" /> Tumatanggap:
                  </span>
                  <span style={styles.metaValue}>
                    {selectedAlert.recipientsCount || 38} rehistradong magsasaka / mamimili
                  </span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Pinagmulan:</span>
                  <span style={styles.metaValue}>
                    {selectedAlert.sender || 'PAGASA Doppler Sensor & LGU Weather System'}
                  </span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Oras ng Paglabas:</span>
                  <span style={styles.metaValue}>{selectedAlert.time}</span>
                </div>
              </div>

              <div>
                <h3 style={styles.detailSectionTitle}>Buong Nilalaman ng Mensahe</h3>
                <p style={styles.fullMessageBody}>{selectedAlert.body}</p>
              </div>

              {selectedAlert.recommendations && selectedAlert.recommendations.length > 0 && (
                <div>
                  <h3 style={styles.detailSectionTitle}>Mga Inirerekomendang Aksyon</h3>
                  <ul style={styles.recList}>
                    {selectedAlert.recommendations.map((rec, idx) => (
                      <li key={idx} style={styles.recItem}>
                        <span style={styles.recBullet} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={handleSendFollowUp}
                style={styles.actionBtnSecondary}>
                <Send size={16} />
                Magpadala ng Follow-up SMS
              </button>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                style={styles.actionBtnPrimary}>
                Isara
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}

function AlertRow({
  alert,
  onOpenDetail,
}: {
  alert: TriggerAlert;
  onOpenDetail: () => void;
}) {
  const tone = ALERT_STYLE[alert.kind];
  const Icon = tone.icon;

  return (
    <div style={styles.alertCard}>
      <span style={{ ...styles.alertIcon, background: tone.tint }}>
        <Icon size={20} color={tone.color} />
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
          <button
            type="button"
            onClick={onOpenDetail}
            style={styles.detailLink}>
            Tingnan ang detalye &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: 18,
    alignItems: 'start',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    background: 'var(--animo-green-tint)',
    border: '1px solid var(--animo-green)',
    borderRadius: 'var(--animo-radius-md)',
    color: 'var(--animo-black)',
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 8,
  },
  sideColumn: { display: 'flex', flexDirection: 'column', gap: 18 },
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
  unreadBadge: {
    padding: '5px 14px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
    fontSize: 13,
    fontWeight: 700,
  },
  alertList: { display: 'flex', flexDirection: 'column', gap: 12 },
  alertCard: {
    display: 'flex',
    gap: 14,
    padding: 16,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  alertIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 'var(--animo-radius-pill)',
    flexShrink: 0,
  },
  alertBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 },
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
    fontSize: 16,
    fontWeight: 700,
  },
  unreadDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  alertBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  alertText: {
    margin: 0,
    fontSize: 14,
    lineHeight: '21px',
    color: 'var(--animo-black-secondary)',
  },
  alertFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  alertTime: { fontSize: 13, color: 'var(--animo-muted)' },
  detailLink: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--animo-green)',
    cursor: 'pointer',
  },
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
    padding: '12px 0',
    borderBottom: '1px solid var(--animo-border)',
  },
  summaryLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
  },
  summaryCount: { fontSize: 16, fontWeight: 800 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  divider: { height: 1, background: 'var(--animo-border)' },
  sectionHeading: {
    margin: '0 0 10px',
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  channelList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  channelLabel: { fontSize: 14, color: 'var(--animo-black-secondary)' },
  channelValue: { fontSize: 14, fontWeight: 700 },
  markRead: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-green)',
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    padding: 26,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--animo-border)',
    paddingBottom: 16,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--animo-muted)',
    padding: 4,
    cursor: 'pointer',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  metaBox: {
    background: 'var(--animo-surface)',
    borderRadius: 'var(--animo-radius-md)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
  },
  metaLabel: {
    color: 'var(--animo-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  metaValue: {
    fontWeight: 700,
    color: 'var(--animo-black)',
  },
  detailSectionTitle: {
    margin: '0 0 8px',
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  fullMessageBody: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  recList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  recItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-black-secondary)',
  },
  recBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    background: 'var(--animo-green)',
    marginTop: 7,
    flexShrink: 0,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    borderTop: '1px solid var(--animo-border)',
    paddingTop: 16,
  },
  actionBtnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-green)',
    background: 'var(--animo-white)',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    padding: '12px 24px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: 'var(--animo-white)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
