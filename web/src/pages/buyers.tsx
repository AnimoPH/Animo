import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import {
  fetchLguBuyerRegistry,
  formatRegisteredDate,
  mapAccountStatus,
  type LguBuyerRow,
} from '@/services/lgu-console-service';

export type BuyersPageProps = {
  onSignOut: () => void;
};

type DisplayBuyer = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  registeredDate: string;
  status: 'active' | 'inactive' | 'suspended';
  completedTransactions: number;
  reportedReviews: number;
};

const STATUS_OPTIONS = ['Lahat', 'Aktibo', 'Suspendido'];

function toDisplayBuyer(row: LguBuyerRow): DisplayBuyer {
  const initials = row.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id: row.buyerId,
    name: row.name,
    initials: initials || '—',
    phone: row.contactNumber?.trim() || '—',
    registeredDate: formatRegisteredDate(row.dateRegistered),
    status: mapAccountStatus(row.accountStatus),
    completedTransactions: row.completedTransactions,
    reportedReviews: row.reportedReviews,
  };
}

/** Registry of buyers with search, filtering, and account review links (live Supabase read). */
export function BuyersPage({ onSignOut }: BuyersPageProps) {
  const navigate = useNavigate();
  const [buyersList, setBuyersList] = useState<DisplayBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Lahat');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchLguBuyerRegistry()
      .then((rows) => {
        if (!cancelled) setBuyersList(rows.map(toDisplayBuyer));
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Hindi ma-load ang registry.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBuyers = useMemo(() => {
    return buyersList.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone.includes(searchQuery);

      const matchesStatus =
        selectedStatus === 'Lahat' ||
        (selectedStatus === 'Aktibo' && b.status === 'active') ||
        (selectedStatus === 'Suspendido' && b.status === 'suspended');

      return matchesSearch && matchesStatus;
    });
  }, [buyersList, searchQuery, selectedStatus]);

  const activeCount = buyersList.filter((b) => b.status === 'active').length;
  const suspendedCount = buyersList.filter((b) => b.status === 'suspended').length;

  return (
    <ConsoleLayout
      title="Mga Mamimili"
      subtitle="Buyers · Rehistro at pagsusuri ng mga nakarehistrong mamimili"
      onSignOut={onSignOut}>
      <section style={styles.summaryRow}>
        <SummaryCard label="Kabuuang Nakarehistro" value={String(buyersList.length)} unit="mamimili" />
        <SummaryCard label="Aktibo" value={String(activeCount)} unit="aktibong bumibili" />
        <SummaryCard
          label="Suspendido"
          value={String(suspendedCount)}
          unit="may paglabag"
          unitColor="var(--animo-danger)"
        />
      </section>

      {loading ? <p style={styles.loadNotice}>Naglo-load ng registry mula sa Supabase…</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      <article className="animo-card" style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.panelTitle}>Listahan ng mga Mamimili</h2>
            <p style={styles.panelSubtitle}>
              Buyer registry & account verification · LGU San Mateo, Rizal
            </p>
          </div>

          <button
            type="button"
            disabled
            title="Kailangan ng LGU auth bago magrehistro ng bagong mamimili"
            style={{ ...styles.addBuyerBtn, opacity: 0.5, cursor: 'not-allowed' }}>
            <Plus size={18} />
            Magrehistro ng Mamimili
          </button>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={18} color="var(--animo-muted)" />
            <input
              type="text"
              placeholder="Maghanap ayon sa pangalan, ID, o numero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div style={styles.filterGroup}>
            <div style={styles.selectWrap}>
              <span style={styles.filterLabel}>Katayuan:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={styles.filterSelect}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Buyer ID', 'Mamimili', 'Numero', 'Natapos na Txn', 'Katayuan', 'Aksyon'].map(
                  (heading) => (
                    <th key={heading} style={styles.th}>
                      {heading.toUpperCase()}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredBuyers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...styles.td,
                      textAlign: 'center',
                      color: 'var(--animo-muted)',
                      padding: '30px 0',
                    }}>
                    Walang nahanap na mamimili sa iyong pamantayan.
                  </td>
                </tr>
              ) : (
                filteredBuyers.map((buyer) => (
                  <BuyerRow
                    key={buyer.id}
                    buyer={buyer}
                    onReview={() => navigate(`/account-review/buyer/${buyer.id}`)}
                  />
                ))
              )}
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
  unitColor,
}: {
  label: string;
  value: string;
  unit: string;
  unitColor?: string;
}) {
  return (
    <article className="animo-card" style={styles.summaryCard}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
      <span style={{ ...styles.summaryUnit, color: unitColor || 'var(--animo-muted)' }}>{unit}</span>
    </article>
  );
}

function BuyerRow({
  buyer,
  onReview,
}: {
  buyer: DisplayBuyer;
  onReview: () => void;
}) {
  const isActive = buyer.status === 'active';
  const isSuspended = buyer.status === 'suspended';

  return (
    <tr>
      <td style={{ ...styles.td, fontWeight: 700, color: '#2563EB', fontSize: 12 }}>
        {buyer.id.slice(0, 8).toUpperCase()}
      </td>
      <td style={styles.td}>
        <span style={styles.identity}>
          <span style={styles.avatar}>{buyer.initials}</span>
          <div>
            <span style={styles.buyerName}>{buyer.name}</span>
            {buyer.reportedReviews > 0 ? (
              <span style={styles.reportCountDot} title={`${buyer.reportedReviews} ulat`}>
                ⚠ {buyer.reportedReviews} ulat
              </span>
            ) : null}
          </div>
        </span>
      </td>
      <td style={styles.td}>{buyer.phone}</td>
      <td style={styles.td}>{buyer.completedTransactions}</td>
      <td style={styles.td}>
        <span
          style={{
            ...styles.statusBadge,
            ...(isActive
              ? styles.statusActive
              : isSuspended
                ? styles.statusSuspended
                : styles.statusInactive),
          }}>
          {isActive ? 'Aktibo' : isSuspended ? 'Suspendido' : 'Hindi aktibo'}
        </span>
      </td>
      <td style={styles.td}>
        <button type="button" onClick={onReview} style={styles.reviewAccountBtn}>
          Suriin ang Account &rarr;
        </button>
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18,
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 22,
  },
  summaryLabel: { fontSize: 14, fontWeight: 600, color: 'var(--animo-black-secondary)' },
  summaryValue: { fontSize: 32, fontWeight: 800, lineHeight: '38px' },
  summaryUnit: { fontSize: 13, color: 'var(--animo-muted)' },
  loadNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-black-secondary)',
    fontSize: 14,
  },
  errorNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-danger)',
    fontSize: 14,
  },
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
  addBuyerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: '#2563EB',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    padding: '12px 16px',
    background: 'var(--animo-surface)',
    borderRadius: 'var(--animo-radius-md)',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--animo-white)',
    border: '1.5px solid var(--animo-border)',
    borderRadius: 'var(--animo-radius-md)',
    padding: '0 14px',
    height: 44,
    flex: 1,
    minWidth: 260,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: 'var(--animo-black)',
  },
  clearSearchBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--animo-muted)',
    padding: 2,
    cursor: 'pointer',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  selectWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--animo-black-secondary)',
  },
  filterSelect: {
    height: 42,
    padding: '0 12px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    background: 'var(--animo-white)',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--animo-black)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    background: 'var(--animo-surface)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: 'var(--animo-black-secondary)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px',
    borderTop: '1px solid var(--animo-border)',
    fontSize: 15,
    whiteSpace: 'nowrap',
  },
  identity: { display: 'inline-flex', alignItems: 'center', gap: 12 },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 'var(--animo-radius-pill)',
    background: '#EFF6FF',
    color: '#2563EB',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  buyerName: { display: 'block', fontSize: 15, fontWeight: 700 },
  reportCountDot: {
    display: 'inline-block',
    fontSize: 11,
    color: 'var(--animo-danger)',
    fontWeight: 700,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 13,
    fontWeight: 700,
  },
  statusActive: {
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
  },
  statusSuspended: {
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
  },
  statusInactive: {
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
  },
  reviewAccountBtn: {
    border: 'none',
    background: 'transparent',
    color: '#2563EB',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
};
