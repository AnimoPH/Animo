import { ConsoleLayout } from '@/components/console-layout';
import { FARMERS, type Farmer } from '@/constants/dashboard';

export type FarmersPageProps = {
  onSignOut: () => void;
};

/** Registry of farmers enrolled under the LGU's barangays. */
export function FarmersPage({ onSignOut }: FarmersPageProps) {
  const active = FARMERS.filter((farmer) => farmer.status === 'active').length;
  const barangays = new Set(FARMERS.map((farmer) => farmer.barangay)).size;

  return (
    <ConsoleLayout
      title="Mga Magsasaka"
      subtitle="Farmers · Rehistro ng mga nakarehistrong magsasaka"
      onSignOut={onSignOut}>
      <section style={styles.summaryRow}>
        <SummaryCard label="Nakarehistro" value={String(FARMERS.length)} unit="magsasaka" />
        <SummaryCard label="Aktibo" value={String(active)} unit="tumatanggap ng payo" />
        <SummaryCard label="Saklaw" value={String(barangays)} unit="barangay" />
      </section>

      <article className="animo-card" style={styles.panel}>
        <div>
          <h2 style={styles.panelTitle}>Listahan ng Magsasaka</h2>
          <p style={styles.panelSubtitle}>
            Farmer registry · LGU San Mateo, Rizal
          </p>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Magsasaka', 'Farmer ID', 'Barangay', 'Numero', 'Laki ng sakahan', 'Katayuan'].map(
                  (heading) => (
                    <th key={heading} style={styles.th}>
                      {heading.toUpperCase()}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {FARMERS.map((farmer) => (
                <FarmerRow key={farmer.id} farmer={farmer} />
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </ConsoleLayout>
  );
}

function SummaryCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <article className="animo-card" style={styles.summaryCard}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
      <span style={styles.summaryUnit}>{unit}</span>
    </article>
  );
}

function FarmerRow({ farmer }: { farmer: Farmer }) {
  const isActive = farmer.status === 'active';

  return (
    <tr>
      <td style={styles.td}>
        <span style={styles.identity}>
          <span style={styles.avatar}>{farmer.initials}</span>
          <span style={styles.farmerName}>{farmer.name}</span>
        </span>
      </td>
      <td style={{ ...styles.td, fontWeight: 600 }}>{farmer.id}</td>
      <td style={styles.td}>{farmer.barangay}</td>
      <td style={styles.td}>{farmer.phone}</td>
      <td style={styles.td}>{farmer.farmSize}</td>
      <td style={styles.td}>
        <span
          style={{
            ...styles.statusBadge,
            ...(isActive ? styles.statusActive : styles.statusInactive),
          }}>
          {isActive ? 'Aktibo' : 'Hindi aktibo'}
        </span>
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 18,
  },
  summaryLabel: { fontSize: 13, color: 'var(--animo-black-secondary)' },
  summaryValue: { fontSize: 28, fontWeight: 700, lineHeight: '34px' },
  summaryUnit: { fontSize: 11, color: 'var(--animo-muted)' },
  panel: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20 },
  panelTitle: { margin: '0 0 4px', fontSize: 18, fontWeight: 700 },
  panelSubtitle: { margin: 0, fontSize: 12, color: 'var(--animo-black-secondary)' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: 'var(--animo-surface)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.4,
    color: 'var(--animo-black-secondary)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px',
    borderTop: '1px solid var(--animo-border)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  identity: { display: 'inline-flex', alignItems: 'center', gap: 10 },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  farmerName: { fontSize: 13, fontWeight: 600 },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 11,
    fontWeight: 600,
  },
  statusActive: {
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
  },
  statusInactive: {
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
  },
};
