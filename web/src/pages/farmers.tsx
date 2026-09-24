import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import type { Farmer } from '@/constants/dashboard';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useLanguage } from '@/hooks/use-language';
import {
  fetchLguFarmerRegistry,
  formatRegisteredDate,
  type LguFarmerRow,
} from '@/services/lgu-console-service';

export type FarmersPageProps = {
  onSignOut: () => void;
};

function toDisplayFarmer(row: LguFarmerRow): Farmer {
  const initials = row.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    id: row.farmerId,
    name: row.name,
    initials: initials || '—',
    barangay: row.barangay,
    phone: '—',
    farmSize: `${row.activeListings} / ${row.totalListings}`,
    registeredDate: formatRegisteredDate(row.dateRegistered),
    status: row.activeListings > 0 ? 'active' : 'inactive',
    rating: 0,
    totalTransactions: 0,
    reviews: [],
    reports: [],
    transactions: [],
  };
}

/** Registry of farmers with search, filtering, and account review links (live Supabase read). */
export function FarmersPage({ onSignOut }: FarmersPageProps) {
  const navigate = useNavigate();
  const { t, isTagalog } = useLanguage();
  const [farmersList, setFarmersList] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const statusOptions = [
    { key: 'all', label: t('common.all') },
    { key: 'active', label: t('common.active') },
    { key: 'inactive', label: t('common.inactive') },
  ];

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const loadFarmers = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchLguFarmerRegistry()
      .then((rows) => {
        if (!cancelled) setFarmersList(rows.map(toDisplayFarmer));
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : t('common.error'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => loadFarmers(), [loadFarmers]);

  useAutoRefresh(loadFarmers);

  const barangayOptions = useMemo(() => {
    const unique = [...new Set(farmersList.map((f) => f.barangay))].sort();
    return [{ key: 'all', label: t('common.all') }, ...unique.map((b) => ({ key: b, label: b }))];
  }, [farmersList, t]);

  const filteredFarmers = useMemo(() => {
    return farmersList.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBarangay =
        selectedBarangay === 'all' || f.barangay === selectedBarangay;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && f.status === 'active') ||
        (selectedStatus === 'inactive' && f.status === 'inactive');

      return matchesSearch && matchesBarangay && matchesStatus;
    });
  }, [farmersList, searchQuery, selectedBarangay, selectedStatus]);

  const activeCount = farmersList.filter((f) => f.status === 'active').length;
  const barangaysCount = new Set(farmersList.map((f) => f.barangay)).size;

  return (
    <ConsoleLayout
      title={t('farmers.title')}
      subtitle={t('farmers.subtitle')}
      onSignOut={onSignOut}>
      {/* Metric summary row */}
      <section style={styles.summaryRow}>
        <SummaryCard
          label={isTagalog ? 'Kabuuang Nakarehistro' : 'Total Registered'}
          value={String(farmersList.length)}
          unit={isTagalog ? 'magsasaka' : 'farmers'}
        />
        <SummaryCard
          label={isTagalog ? 'Aktibo' : 'Active'}
          value={String(activeCount)}
          unit={isTagalog ? 'may available na listing' : 'with active listings'}
        />
        <SummaryCard
          label={isTagalog ? 'Saklaw' : 'Coverage'}
          value={String(barangaysCount)}
          unit={isTagalog ? 'barangay' : 'barangays'}
        />
      </section>

      {loading ? <p style={styles.loadNotice}>{t('common.loading')}</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      {/* Main Table Card */}
      <article className="animo-card" style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.panelTitle}>{t('farmers.title')}</h2>
            <p style={styles.panelSubtitle}>
              {isTagalog
                ? 'Talaan ng mga magsasaka at pag-verify ng account · LGU San Mateo, Rizal'
                : 'Farmer registry & account verification · LGU San Mateo, Rizal'}
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={18} color="var(--animo-muted)" />
            <input
              type="text"
              placeholder={t('farmers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={styles.clearSearchBtn}>
                <X size={16} />
              </button>
            )}
          </div>

          <div style={styles.filterGroup}>
            <div style={styles.selectWrap}>
              <span style={styles.filterLabel}>{t('farmers.filterBarangay')}</span>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                style={styles.filterSelect}>
                {barangayOptions.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrap}>
              <span style={styles.filterLabel}>{t('farmers.filterStatus')}</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={styles.filterSelect}>
                {statusOptions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Farmers Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['ID', t('farmers.colName'), t('farmers.colBarangay'), t('common.phone'), t('farmers.colListings'), t('common.status'), t('common.actions')].map(
                  (heading) => (
                    <th key={heading} style={styles.th}>
                      {heading.toUpperCase()}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--animo-muted)', padding: '30px 0' }}>
                    {t('farmers.noResults')}
                  </td>
                </tr>
              ) : (
                filteredFarmers.map((farmer) => (
                  <FarmerRow
                    key={farmer.id}
                    farmer={farmer}
                    isTagalog={isTagalog}
                    onReview={() => navigate(`/account-review/farmer/${farmer.id}`)}
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

function FarmerRow({
  farmer,
  isTagalog,
  onReview,
}: {
  farmer: Farmer;
  isTagalog: boolean;
  onReview: () => void;
}) {
  const isActive = farmer.status === 'active';
  const isSuspended = farmer.status === 'suspended';

  return (
    <tr>
      {/* Farmer ID (First Column) */}
      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--animo-green)', fontSize: 12 }}>
        {farmer.id.slice(0, 8).toUpperCase()}
      </td>
      <td style={styles.td}>
        <span style={styles.identity}>
          <span style={styles.avatar}>{farmer.initials}</span>
          <div>
            <span style={styles.farmerName}>{farmer.name}</span>
            {farmer.reports && farmer.reports.length > 0 && (
              <span style={styles.reportCountDot} title={`${farmer.reports.length} report(s)`}>
                ⚠ {farmer.reports.length} {isTagalog ? 'ulat' : 'reports'}
              </span>
            )}
          </div>
        </span>
      </td>
      <td style={styles.td}>{farmer.barangay}</td>
      <td style={styles.td}>{farmer.phone}</td>
      <td style={styles.td}>{farmer.farmSize}</td>
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
          {isActive
            ? (isTagalog ? 'Aktibo' : 'Active')
            : isSuspended
              ? (isTagalog ? 'Suspendido' : 'Suspended')
              : (isTagalog ? 'Hindi aktibo' : 'Inactive')}
        </span>
      </td>
      <td style={styles.td}>
        <button
          type="button"
          onClick={onReview}
          style={styles.reviewAccountBtn}>
          {isTagalog ? 'Suriin ang Account \u2192' : 'Review Account \u2192'}
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
  addFarmerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 120ms ease',
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 840 },
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
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  farmerName: { display: 'block', fontSize: 15, fontWeight: 700 },
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
    color: 'var(--animo-green)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
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
    zIndex: 200,
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
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
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  modalSubtitle: { margin: '2px 0 0', fontSize: 13, color: 'var(--animo-muted)' },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'var(--animo-green-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--animo-muted)',
    padding: 4,
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: 'var(--animo-black)',
  },
  inputField: {
    width: '100%',
    height: 46,
    padding: '0 14px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    fontSize: 15,
  },
  selectField: {
    width: '100%',
    height: 46,
    padding: '0 14px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    fontSize: 15,
    background: 'var(--animo-white)',
  },
  formRow: {
    display: 'flex',
    gap: 14,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'transparent',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
