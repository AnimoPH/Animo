import {
  ChevronRight,
  Database,
  FileText,
  Lock,
  Phone,
  TriangleAlert,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { APP_INFO, LEGAL_LINKS, LGU_PROFILE } from '@/constants/dashboard';

export type SettingsPageProps = {
  onSignOut: () => void;
};

const LEGAL_ICONS = {
  file: FileText,
  lock: Lock,
  database: Database,
} as const;

/** Account details, security options and legal links for the LGU officer. */
export function SettingsPage({ onSignOut }: SettingsPageProps) {
  return (
    <ConsoleLayout
      title="Mga Setting"
      subtitle="Settings · Personal na detalye at legal"
      onSignOut={onSignOut}>
      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Personal na Detalye</h2>
              <p style={styles.panelSubtitle}>Personal details</p>
            </div>
            <button type="button" style={styles.editButton}>
              Baguhin
            </button>
          </div>

          <div style={styles.identity}>
            <span style={styles.avatarLarge}>{LGU_PROFILE.initials}</span>
            <div>
              <div style={styles.identityName}>{LGU_PROFILE.name}</div>
              <div style={styles.identityRole}>
                {LGU_PROFILE.role} · {LGU_PROFILE.lgu}
              </div>
              <div style={styles.chipRow}>
                <span style={styles.chipVerified}>Verified LGU Account</span>
              </div>
            </div>
          </div>

          <dl style={styles.detailList}>
            <DetailRow label="Buong pangalan" value={LGU_PROFILE.name} />
            <DetailRow label="Posisyon" value={LGU_PROFILE.role} />
            <DetailRow label="Email" value={LGU_PROFILE.email} />
            <DetailRow label="Numero ng telepono" value={LGU_PROFILE.phone} />
            <DetailRow label="LGU" value="San Mateo, Rizal" />
            <DetailRow label="Saklaw na barangay" value={LGU_PROFILE.barangays} />
          </dl>

          <h3 style={styles.sectionHeading}>Seguridad</h3>
          <div style={styles.actionList}>
            <ActionRow
              icon={<Lock size={20} color="var(--animo-black-secondary)" />}
              title="Palitan ang password"
              subtitle="Huling binago noong Ago 4, 2025"
            />
            <ActionRow
              icon={<Phone size={20} color="var(--animo-black-secondary)" />}
              title="Two-factor authentication"
              subtitle={`Naka-on sa ${LGU_PROFILE.phone}`}
            />
          </div>
        </article>

        <aside style={styles.sideColumn}>
          <article className="animo-card" style={styles.panel}>
            <div>
              <h2 style={styles.panelTitle}>Legal</h2>
              <p style={styles.panelSubtitle}>
                Terms and Conditions at Privacy Policy
              </p>
            </div>

            <div style={styles.actionList}>
              {LEGAL_LINKS.map((link) => {
                const Icon = LEGAL_ICONS[link.icon];
                return (
                  <ActionRow
                    key={link.key}
                    icon={<Icon size={20} color="var(--animo-black-secondary)" />}
                    title={link.title}
                    subtitle={link.subtitle}
                    bordered
                  />
                );
              })}
            </div>

            <div>
              <h3 style={styles.sectionHeading}>Tungkol sa app</h3>
              <dl style={styles.detailList}>
                {APP_INFO.map((info) => (
                  <DetailRow
                    key={info.label}
                    label={info.label}
                    value={info.value}
                  />
                ))}
              </dl>
            </div>

            <button type="button" onClick={onSignOut} style={styles.signOutButton}>
              Mag-sign out
            </button>

            <div style={styles.warning}>
              <TriangleAlert
                size={18}
                color="var(--animo-danger)"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>
                Kakailanganin mong mag-login muli para makita ang dashboard.
              </span>
            </div>
          </article>
        </aside>
      </div>
    </ConsoleLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailRow}>
      <dt style={styles.detailLabel}>{label}</dt>
      <dd style={styles.detailValue}>{value}</dd>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  bordered = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.actionRow,
        ...(bordered ? styles.actionRowBordered : null),
      }}>
      {icon}
      <span style={styles.actionText}>
        <span style={styles.actionTitle}>{title}</span>
        <span style={styles.actionSubtitle}>{subtitle}</span>
      </span>
      <ChevronRight size={20} color="var(--animo-muted)" />
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gap: 18,
    alignItems: 'start',
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
  editButton: {
    padding: '6px 16px',
    borderRadius: 'var(--animo-radius-pill)',
    border: 'none',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 14,
    fontWeight: 700,
  },
  identity: { display: 'flex', alignItems: 'center', gap: 18 },
  avatarLarge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 22,
    fontWeight: 800,
    flexShrink: 0,
  },
  identityName: { fontSize: 22, fontWeight: 800 },
  identityRole: {
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    marginTop: 2,
  },
  chipRow: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chipVerified: {
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 700,
  },
  detailList: { margin: 0, display: 'flex', flexDirection: 'column' },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    padding: '12px 0',
    borderTop: '1px solid var(--animo-border)',
  },
  detailLabel: {
    margin: 0,
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    flexShrink: 0,
  },
  detailValue: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    textAlign: 'right',
  },
  sectionHeading: {
    margin: '10px 0 0',
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  actionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-surface)',
    textAlign: 'left',
  },
  actionRowBordered: {
    background: 'var(--animo-white)',
    border: '1px solid var(--animo-border)',
  },
  actionText: { flex: 1, minWidth: 0 },
  actionTitle: { display: 'block', fontSize: 15, fontWeight: 700 },
  actionSubtitle: {
    display: 'block',
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
    marginTop: 2,
  },
  signOutButton: {
    height: 52,
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-danger)',
    background: 'var(--animo-white)',
    color: 'var(--animo-danger)',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-danger-tint)',
    fontSize: 13,
    lineHeight: '18px',
    color: 'var(--animo-black-secondary)',
  },
};
