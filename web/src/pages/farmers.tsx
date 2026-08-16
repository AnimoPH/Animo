import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { FARMERS, type Farmer } from '@/constants/dashboard';

export type FarmersPageProps = {
  onSignOut: () => void;
};

const BARANGAY_OPTIONS = [
  'Lahat',
  'Brgy. San Jose',
  'Brgy. Concepcion',
  'Brgy. Sta. Cruz',
  'Brgy. Tibag',
  'Brgy. Pagala',
  'Brgy. Makinabang',
];

const STATUS_OPTIONS = ['Lahat', 'Aktibo', 'Hindi aktibo', 'Suspendido'];

/** Registry of farmers with search, filtering, registration modal, and account review links. */
export function FarmersPage({ onSignOut }: FarmersPageProps) {
  const navigate = useNavigate();
  const [farmersList, setFarmersList] = useState<Farmer[]>(FARMERS);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('Lahat');
  const [selectedStatus, setSelectedStatus] = useState('Lahat');

  // Add Farmer Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBarangay, setNewBarangay] = useState('Brgy. San Jose');
  const [newPhone, setNewPhone] = useState('');
  const [newFarmSize, setNewFarmSize] = useState('1.0 ha');

  const filteredFarmers = useMemo(() => {
    return farmersList.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.phone.includes(searchQuery);

      const matchesBarangay =
        selectedBarangay === 'Lahat' || f.barangay === selectedBarangay;

      const matchesStatus =
        selectedStatus === 'Lahat' ||
        (selectedStatus === 'Aktibo' && f.status === 'active') ||
        (selectedStatus === 'Hindi aktibo' && f.status === 'inactive') ||
        (selectedStatus === 'Suspendido' && f.status === 'suspended');

      return matchesSearch && matchesBarangay && matchesStatus;
    });
  }, [farmersList, searchQuery, selectedBarangay, selectedStatus]);

  const activeCount = farmersList.filter((f) => f.status === 'active').length;
  const suspendedCount = farmersList.filter((f) => f.status === 'suspended').length;
  const barangaysCount = new Set(farmersList.map((f) => f.barangay)).size;

  const handleAddFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const initials = newName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newId = `FRM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newFarmer: Farmer = {
      id: newId,
      name: newName,
      initials: initials || 'JD',
      barangay: newBarangay,
      phone: newPhone,
      farmSize: newFarmSize,
      registeredDate: 'Ngayong araw',
      status: 'active',
      rating: 5.0,
      totalTransactions: 0,
      reviews: [],
      reports: [],
      transactions: [],
    };

    setFarmersList([newFarmer, ...farmersList]);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
  };

  return (
    <ConsoleLayout
      title="Mga Magsasaka"
      subtitle="Farmers · Rehistro at pagsusuri ng mga nakarehistrong magsasaka"
      onSignOut={onSignOut}>
      {/* Metric summary row */}
      <section style={styles.summaryRow}>
        <SummaryCard label="Kabuuang Nakarehistro" value={String(farmersList.length)} unit="magsasaka" />
        <SummaryCard label="Aktibo" value={String(activeCount)} unit="tumatanggap ng payo" />
        <SummaryCard label="Suspendido" value={String(suspendedCount)} unit="may paglabag" unitColor="var(--animo-danger)" />
        <SummaryCard label="Saklaw" value={String(barangaysCount)} unit="barangay" />
      </section>

      {/* Main Table Card */}
      <article className="animo-card" style={styles.panel}>
        <div style={styles.panelHead}>
          <div>
            <h2 style={styles.panelTitle}>Listahan ng Magsasaka</h2>
            <p style={styles.panelSubtitle}>
              Farmer registry & account verification · LGU San Mateo, Rizal
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={styles.addFarmerBtn}>
            <Plus size={18} />
            Magrehistro ng Magsasaka
          </button>
        </div>

        {/* Search & Filter Toolbar */}
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
              <span style={styles.filterLabel}>Barangay:</span>
              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                style={styles.filterSelect}>
                {BARANGAY_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

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

        {/* Farmers Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Farmer ID', 'Magsasaka', 'Barangay', 'Numero', 'Laki ng Sakahan', 'Katayuan', 'Aksyon'].map(
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
                    Walang nahanap na magsasaka sa iyong pamantayan.
                  </td>
                </tr>
              ) : (
                filteredFarmers.map((farmer) => (
                  <FarmerRow
                    key={farmer.id}
                    farmer={farmer}
                    onReview={() => navigate(`/account-review/farmer/${farmer.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Add Farmer Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={styles.modalIconWrap}>
                  <UserPlus size={22} color="var(--animo-green)" />
                </span>
                <div>
                  <h2 style={styles.modalTitle}>Magrehistro ng Bagong Magsasaka</h2>
                  <p style={styles.modalSubtitle}>Magdagdag sa LGU Registry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFarmer} style={styles.modalForm}>
              <div>
                <label style={styles.fieldLabel}>Buong Pangalan ng Magsasaka *</label>
                <input
                  type="text"
                  required
                  placeholder="Hal. Juan Dela Cruz"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Barangay *</label>
                  <select
                    value={newBarangay}
                    onChange={(e) => setNewBarangay(e.target.value)}
                    style={styles.selectField}>
                    {BARANGAY_OPTIONS.filter((b) => b !== 'Lahat').map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.fieldLabel}>Numero ng Telepono *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0917 XXX XXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div>
                <label style={styles.fieldLabel}>Laki ng Sakahan (Hectares)</label>
                <input
                  type="text"
                  placeholder="Hal. 1.5 ha"
                  value={newFarmSize}
                  onChange={(e) => setNewFarmSize(e.target.value)}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={styles.cancelBtn}>
                  Kanselahin
                </button>
                <button type="submit" style={styles.submitBtn}>
                  <UserPlus size={18} />
                  I-rehistro ang Magsasaka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  onReview,
}: {
  farmer: Farmer;
  onReview: () => void;
}) {
  const isActive = farmer.status === 'active';
  const isSuspended = farmer.status === 'suspended';

  return (
    <tr>
      {/* Farmer ID (First Column) */}
      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--animo-green)' }}>
        {farmer.id}
      </td>
      <td style={styles.td}>
        <span style={styles.identity}>
          <span style={styles.avatar}>{farmer.initials}</span>
          <div>
            <span style={styles.farmerName}>{farmer.name}</span>
            {farmer.reports && farmer.reports.length > 0 && (
              <span style={styles.reportCountDot} title={`${farmer.reports.length} report(s)`}>
                ⚠ {farmer.reports.length} ulat
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
          {isActive ? 'Aktibo' : isSuspended ? 'Suspendido' : 'Hindi aktibo'}
        </span>
      </td>
      <td style={styles.td}>
        <button
          type="button"
          onClick={onReview}
          style={styles.reviewAccountBtn}>
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
