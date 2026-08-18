import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Star,
  TriangleAlert,
  UserX,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import {
  fetchLguUserProfile,
  fetchLguUserReviews,
  fetchLguUserTransactions,
  formatRegisteredDate,
  formatReviewDate,
  mapAccountStatus,
  mapRoleLabel,
  type LguUserProfile,
  type LguUserReview,
  type LguUserTransaction,
} from '@/services/lgu-console-service';

export type AccountReviewPageProps = {
  onSignOut: () => void;
};

type TabType = 'reviews' | 'reports' | 'transactions';

type DisplayReport = {
  id: string;
  reason: string;
  details: string;
  reportedBy: string;
  role: string;
  date: string;
  status: 'pending' | 'investigating' | 'resolved';
};

const STAR_GOLD = '#F59E0B';

/**
 * Account Review Page — live profile, reviews, reported ratings, and transactions from Supabase.
 * Suspend/unsuspend stays local until LGU auth lands.
 */
export function AccountReviewPage({ onSignOut }: AccountReviewPageProps) {
  const { type = 'farmer', id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();
  const isFarmer = type === 'farmer';
  const userId = id ?? '';

  const [profile, setProfile] = useState<LguUserProfile | null>(null);
  const [reviews, setReviews] = useState<LguUserReview[]>([]);
  const [transactions, setTransactions] = useState<LguUserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('reviews');
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [suspensionReason, setSuspensionReason] = useState('Paglabag sa mga alituntunin ng transaksyon.');
  const [resolvedReportIds, setResolvedReportIds] = useState<string[]>([]);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [inputReason, setInputReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetchLguUserProfile(userId),
      fetchLguUserReviews(userId),
      fetchLguUserTransactions(userId, isFarmer ? 'farmer' : 'buyer'),
    ])
      .then(([loadedProfile, loadedReviews, loadedTransactions]) => {
        if (cancelled) return;
        if (!loadedProfile) {
          setLoadError('Hindi mahanap ang account sa registry.');
          setProfile(null);
          return;
        }
        setProfile(loadedProfile);
        setReviews(loadedReviews);
        setTransactions(loadedTransactions);
        setAccountStatus(mapAccountStatus(loadedProfile.accountStatus));
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Hindi ma-load ang account.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isFarmer]);

  const reports = useMemo<DisplayReport[]>(() => {
    return reviews
      .filter((review) => review.reported)
      .map((review) => ({
        id: review.ratingId,
        reason: review.reportReason?.trim() || 'Inulat na review',
        details: review.comment?.trim() || 'Walang komento sa ulat.',
        reportedBy: review.raterName,
        role: mapRoleLabel(review.raterRole),
        date: formatReviewDate(review.createdAt),
        status: resolvedReportIds.includes(review.ratingId) ? 'resolved' : 'pending',
      }));
  }, [reviews, resolvedReportIds]);

  const name = profile?.fullName ?? '—';
  const initials =
    profile?.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '—';
  const barangay = profile?.barangay ?? (isFarmer ? 'Hindi nakasaad' : '—');
  const phone = profile?.contactNumber?.trim() || '—';
  const registeredDate = profile ? formatRegisteredDate(profile.dateRegistered) : '—';
  const rating = profile?.averageRating ?? 0;
  const totalTransactions = profile?.completedTransactions ?? 0;

  const handleConfirmSuspend = () => {
    setAccountStatus('suspended');
    setSuspensionReason(inputReason || 'Paglabag sa mga alituntunin ng transaksyon.');
    setShowSuspendModal(false);
    setInputReason('');
    setToastMessage(`Matagumpay na nasuspinde ang account ni ${name}.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmUnsuspend = () => {
    setAccountStatus('active');
    setShowUnsuspendModal(false);
    setToastMessage(`Matagumpay na naibalik ang account ni ${name} sa aktibong katayuan.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResolveReport = (reportId: string) => {
    setResolvedReportIds((prev) => [...prev, reportId]);
    setToastMessage('Matagumpay na minarkahan ang ulat bilang Nalutas (Resolved).');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <ConsoleLayout
      title={`Pagsusuri ng Account: ${name}`}
      subtitle={`Account Review · ${isFarmer ? 'Magsasaka' : 'Mamimili'} (${userId})`}
      onSignOut={onSignOut}>
      {loading ? <p style={styles.loadNotice}>Naglo-load ng account mula sa Supabase…</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      {/* Back Button */}
      <div style={styles.topBackRow}>
        <button
          type="button"
          onClick={() => navigate(isFarmer ? '/farmers' : '/buyers')}
          style={styles.backButton}>
          <ArrowLeft size={18} />
          Bumalik sa {isFarmer ? 'Listahan ng Magsasaka' : 'Listahan ng Mamimili'}
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={20} color="var(--animo-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Suspended Alert Banner if currently suspended */}
      {accountStatus === 'suspended' && (
        <div style={styles.suspendedBanner}>
          <AlertOctagon size={24} color="var(--animo-danger)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h3 style={styles.suspendedBannerTitle}>Kasalukuyang Suspendido ang Account</h3>
            <p style={styles.suspendedBannerText}>
              <strong>Dahilan:</strong> {suspensionReason}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUnsuspendModal(true)}
            style={styles.unsuspendBannerBtn}>
            <RotateCcw size={16} />
            Ibalik ang Account
          </button>
        </div>
      )}

      {/* Main Account Details Card */}
      <article className="animo-card" style={styles.profileCard}>
        <div style={styles.profileHead}>
          <div style={styles.profileIdentity}>
            <span
              style={{
                ...styles.avatarBig,
                background: isFarmer ? 'var(--animo-green-tint)' : '#EFF6FF',
                color: isFarmer ? 'var(--animo-green)' : '#2563EB',
              }}>
              {initials}
            </span>
            <div>
              <div style={styles.nameRow}>
                <h2 style={styles.profileName}>{name}</h2>
                <span
                  style={{
                    ...styles.statusPill,
                    ...(accountStatus === 'active'
                      ? styles.statusPillActive
                      : accountStatus === 'suspended'
                        ? styles.statusPillSuspended
                        : styles.statusPillInactive),
                  }}>
                  {accountStatus === 'active'
                    ? 'Aktibo'
                    : accountStatus === 'suspended'
                      ? 'Suspendido'
                      : 'Hindi Aktibo'}
                </span>
                <span style={styles.roleBadge}>
                  <ShieldCheck size={14} />
                  {isFarmer ? 'Rehistradong Magsasaka' : 'Rehistradong Mamimili'}
                </span>
              </div>
              <p style={styles.profileSub}>
                ID: <strong>{userId.slice(0, 8).toUpperCase()}</strong>
                {isFarmer ? ` · ${barangay}, San Mateo, Rizal` : ' · Mamimili · Rizal'}
              </p>
            </div>
          </div>

          {/* Suspend / Unsuspend Action Button */}
          <div style={styles.headActionWrap}>
            {accountStatus === 'suspended' ? (
              <button
                type="button"
                onClick={() => setShowUnsuspendModal(true)}
                style={styles.unsuspendButton}>
                <RotateCcw size={18} />
                Ibalik ang Account (Unsuspend)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSuspendModal(true)}
                style={styles.suspendButton}>
                <UserX size={18} />
                Suspendihin ang Account
              </button>
            )}
          </div>
        </div>

        <div style={styles.divider} />

        {/* Metadata Details Grid (Email and Uri ng Mamimili removed) */}
        <div style={styles.metaGrid}>
          <MetaItem icon={Phone} label="Numero ng Telepono" value={phone} />
          <MetaItem icon={MapPin} label="Barangay / Lokasyon" value={barangay} />
          <MetaItem icon={Calendar} label="Petsa ng Rehistro" value={registeredDate} />
          <MetaItem
            icon={Star}
            label="Rating Score"
            value={
              profile?.reviewCount
                ? `${rating.toFixed(1)} / 5.0 ⭐ (${profile.reviewCount} review${profile.reviewCount === 1 ? '' : 's'})`
                : 'Walang review pa'
            }
          />
        </div>
      </article>

      {/* Tabs Navigation */}
      <div style={styles.tabBar}>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'reviews' ? styles.tabButtonActive : null),
          }}>
          <Star size={18} />
          Mga Natanggap na Review ({reviews.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'reports' ? styles.tabButtonActive : null),
          }}>
          <TriangleAlert size={18} />
          Mga Ulat at Reklamo ({reports.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'transactions' ? styles.tabButtonActive : null),
          }}>
          <FileSpreadsheet size={18} />
          Kasaysayan ng Transaksyon ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Received Reviews */}
      {activeTab === 'reviews' && (
        <article className="animo-card" style={styles.panel}>
          <div style={styles.reviewsHead}>
            <div style={styles.ratingScoreBox}>
              <span style={styles.bigRatingNum}>{profile?.reviewCount ? rating.toFixed(1) : '—'}</span>
              <div>
                <div style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={20}
                      color={profile?.reviewCount && s <= Math.round(rating) ? STAR_GOLD : '#E5E7EB'}
                      fill={profile?.reviewCount && s <= Math.round(rating) ? STAR_GOLD : '#E5E7EB'}
                    />
                  ))}
                </div>
                <span style={styles.ratingScoreSub}>
                  {profile?.reviewCount
                    ? `Batay sa ${profile.reviewCount} kumpirmadong review`
                    : 'Walang natatanggap na review pa'}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.reviewsList}>
            {reviews.length === 0 ? (
              <p style={styles.emptyNotice}>Wala pang natatanggap na review ang account na ito.</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.ratingId} style={styles.reviewCard}>
                  <div style={styles.reviewCardHead}>
                    <div>
                      <div style={styles.reviewerRow}>
                        <span style={styles.reviewerName}>{rev.raterName}</span>
                        <span style={styles.reviewerRolePill}>{mapRoleLabel(rev.raterRole)}</span>
                      </div>
                      <span style={styles.reviewDate}>{formatReviewDate(rev.createdAt)}</span>
                    </div>

                    <div style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          color={s <= rev.score ? STAR_GOLD : '#E5E7EB'}
                          fill={s <= rev.score ? STAR_GOLD : '#E5E7EB'}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.comment ? <p style={styles.reviewComment}>"{rev.comment}"</p> : null}

                  <span style={styles.reviewTxnRef}>
                    Transaction: <strong>{rev.transactionId.slice(0, 8).toUpperCase()}</strong>
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      )}

      {/* Tab 2: User Reports & Disputes */}
      {activeTab === 'reports' && (
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Mga Ulat at Reklamo</h2>
              <p style={styles.panelSubtitle}>
                Mga reklamong inihain ng ibang gumagamit laban sa account na ito
              </p>
            </div>
          </div>

          <div style={styles.reportsList}>
            {reports.length === 0 ? (
              <div style={styles.emptyReportsBox}>
                <CheckCircle2 size={36} color="var(--animo-green)" />
                <p style={styles.emptyNotice}>
                  Walang nakabinbing ulat o reklamo laban sa account na ito. Malinis ang rekord.
                </p>
              </div>
            ) : (
              reports.map((rep) => (
                <div key={rep.id} style={styles.reportCard}>
                  <div style={styles.reportCardHead}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={styles.reportReason}>{rep.reason}</span>
                        <span
                          style={{
                            ...styles.reportStatusBadge,
                            ...(rep.status === 'resolved'
                              ? styles.reportStatusResolved
                              : rep.status === 'investigating'
                                ? styles.reportStatusInvestigating
                                : styles.reportStatusPending),
                          }}>
                          {rep.status === 'resolved'
                            ? 'Nalutas'
                            : rep.status === 'investigating'
                              ? 'Iniimbestigahan'
                              : 'Nakabinbin'}
                        </span>
                      </div>
                      <span style={styles.reportSub}>
                        Inihain ni {rep.reportedBy} ({rep.role}) noong {rep.date}
                      </span>
                    </div>

                    {rep.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep.id)}
                        style={styles.resolveReportBtn}>
                        <CheckCircle2 size={16} />
                        Markahan bilang Nalutas
                      </button>
                    )}
                  </div>

                  <p style={styles.reportDetails}>{rep.details}</p>
                </div>
              ))
            )}
          </div>
        </article>
      )}

      {/* Tab 3: Transaction History */}
      {activeTab === 'transactions' && (
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Kasaysayan ng Transaksyon</h2>
              <p style={styles.panelSubtitle}>
                Kabuuang {totalTransactions} transaksyon sa ANIMO
              </p>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Reference', 'Uri ng Palay', 'Dami (kg)', 'Halaga', 'Katransaksyon', 'Petsa', 'Katayuan'].map(
                    (heading) => (
                      <th key={heading} style={styles.th}>
                        {heading.toUpperCase()}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--animo-muted)' }}>
                      Walang nakatalang transaksyon kamakailan.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.transactionId}>
                      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--animo-green)' }}>
                        {txn.transactionId.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={styles.td}>{txn.variety}</td>
                      <td style={styles.td}>{txn.quantityKg} kg</td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        ₱{txn.totalAmount.toLocaleString()}
                      </td>
                      <td style={styles.td}>{txn.partnerName}</td>
                      <td style={styles.td}>
                        {txn.dateCompleted ? formatRegisteredDate(txn.dateCompleted) : '—'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.statusPillActive}>Kumpleto</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={styles.dangerIconWrap}>
                  <UserX size={24} color="var(--animo-danger)" />
                </span>
                <div>
                  <h2 style={styles.modalTitle}>Suspendihin ang Account ni {name}?</h2>
                  <p style={styles.modalSubtitle}>Account Suspension Protocol</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Ang pagsuspinde sa account na ito ay magbabawal sa kanila na maglista ng palay,
                magpadala ng purchase orders, o magsagawa ng anumang transaksyon sa Animo.
              </p>

              <div>
                <label style={styles.fieldLabel}>Dahilan ng Pagsuspinde *</label>
                <textarea
                  rows={3}
                  value={inputReason}
                  onChange={(e) => setInputReason(e.target.value)}
                  placeholder="Isulat ang opisyal na dahilan (hal. Paglabag sa timbang, hindi sumipot sa pickup, atbp.)..."
                  style={styles.textareaField}
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                style={styles.cancelBtn}>
                Kanselahin
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={!inputReason.trim()}
                style={styles.confirmSuspendBtn}>
                <UserX size={18} />
                Kumpirmahin ang Pagsuspinde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsuspend Confirmation Modal */}
      {showUnsuspendModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={styles.successIconWrap}>
                  <RotateCcw size={24} color="var(--animo-green)" />
                </span>
                <div>
                  <h2 style={styles.modalTitle}>Ibalik ang Account ni {name}?</h2>
                  <p style={styles.modalSubtitle}>Restore Account Access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnsuspendModal(false)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Tatanggalin ang suspensyon at muling mabibigyan ng buong access si {name} sa ANIMO marketplace.
              </p>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowUnsuspendModal(false)}
                style={styles.cancelBtn}>
                Kanselahin
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsuspend}
                style={styles.confirmUnsuspendBtn}>
                <CheckCircle2 size={18} />
                Oo, Ibalik ang Account
              </button>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div style={styles.metaItem}>
      <span style={styles.metaIcon}>
        <Icon size={18} color="var(--animo-black-secondary)" />
      </span>
      <div>
        <span style={styles.metaLabel}>{label}</span>
        <span style={styles.metaValue}>{value}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBackRow: {
    marginBottom: -8,
  },
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
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    background: 'transparent',
    color: 'var(--animo-green)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
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
  },
  suspendedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 20px',
    background: 'var(--animo-danger-tint)',
    border: '1.5px solid var(--animo-danger)',
    borderRadius: 'var(--animo-radius-lg)',
  },
  suspendedBannerTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--animo-danger)',
  },
  suspendedBannerText: {
    margin: '4px 0 0',
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
  },
  unsuspendBannerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: 26,
  },
  profileHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  profileIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  avatarBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 800,
    flexShrink: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  profileName: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  profileSub: {
    margin: '4px 0 0',
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
  },
  statusPill: {
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 12,
    fontWeight: 700,
  },
  statusPillActive: {
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
  },
  statusPillSuspended: {
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
  },
  statusPillInactive: {
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 'var(--animo-radius-pill)',
    background: '#EFF6FF',
    color: '#2563EB',
    fontSize: 12,
    fontWeight: 700,
  },
  headActionWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  suspendButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-danger)',
    background: 'var(--animo-white)',
    color: 'var(--animo-danger)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  unsuspendButton: {
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
  },
  divider: {
    height: 1,
    background: 'var(--animo-border)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  metaIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--animo-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaLabel: {
    display: 'block',
    fontSize: 12,
    color: 'var(--animo-muted)',
  },
  metaValue: {
    display: 'block',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--animo-black)',
    marginTop: 1,
  },
  tabBar: {
    display: 'flex',
    gap: 12,
    borderBottom: '2px solid var(--animo-border)',
    paddingBottom: 2,
  },
  tabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 18px',
    border: 'none',
    background: 'transparent',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--animo-black-secondary)',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    marginBottom: -2,
  },
  tabButtonActive: {
    color: 'var(--animo-green)',
    borderBottomColor: 'var(--animo-green)',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: 26,
  },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 20, fontWeight: 800 },
  panelSubtitle: { margin: 0, fontSize: 14, color: 'var(--animo-black-secondary)' },
  reviewsHead: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 32,
    alignItems: 'center',
  },
  ratingScoreBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    borderRadius: 'var(--animo-radius-lg)',
    background: 'var(--animo-surface)',
  },
  bigRatingNum: {
    fontSize: 44,
    fontWeight: 900,
    color: 'var(--animo-black)',
  },
  starsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  ratingScoreSub: {
    display: 'block',
    fontSize: 12,
    color: 'var(--animo-muted)',
    marginTop: 4,
  },
  criteriaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  criteriaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  criteriaLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
  },
  criteriaLabel: { color: 'var(--animo-black-secondary)', fontWeight: 600 },
  criteriaScore: { fontWeight: 700 },
  criteriaTrack: {
    height: 6,
    borderRadius: 3,
    background: 'var(--animo-surface)',
    overflow: 'hidden',
  },
  criteriaFill: {
    height: '100%',
    background: 'var(--animo-green)',
    borderRadius: 3,
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  reviewCard: {
    padding: 18,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  reviewCardHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reviewerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: 700,
  },
  reviewerRolePill: {
    padding: '2px 8px',
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-surface)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--animo-black-secondary)',
  },
  reviewDate: {
    fontSize: 12,
    color: 'var(--animo-muted)',
  },
  reviewComment: {
    margin: '4px 0',
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-black-secondary)',
  },
  reviewTxnRef: {
    fontSize: 12,
    color: 'var(--animo-muted)',
  },
  reportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  emptyNotice: {
    margin: 0,
    fontSize: 15,
    color: 'var(--animo-muted)',
    textAlign: 'center',
    padding: '20px 0',
  },
  emptyReportsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 32,
    textAlign: 'center',
  },
  reportCard: {
    padding: 18,
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    background: 'var(--animo-white)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  reportCardHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  reportReason: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--animo-black)',
  },
  reportStatusBadge: {
    padding: '3px 10px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 11,
    fontWeight: 700,
  },
  reportStatusResolved: {
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
  },
  reportStatusInvestigating: {
    background: 'var(--animo-warning-tint)',
    color: 'var(--animo-warning)',
  },
  reportStatusPending: {
    background: 'var(--animo-danger-tint)',
    color: 'var(--animo-danger)',
  },
  reportSub: {
    display: 'block',
    fontSize: 12,
    color: 'var(--animo-muted)',
    marginTop: 4,
  },
  reportDetails: {
    margin: 0,
    fontSize: 14,
    lineHeight: '20px',
    color: 'var(--animo-black-secondary)',
  },
  resolveReportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-green)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
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
    gap: 16,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  modalSubtitle: { margin: '2px 0 0', fontSize: 13, color: 'var(--animo-muted)' },
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
    gap: 14,
  },
  modalText: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  fieldLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: 'var(--animo-black)',
  },
  textareaField: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    fontSize: 14,
    fontFamily: 'inherit',
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
  confirmSuspendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 22px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-danger)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmUnsuspendBtn: {
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
  dangerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'var(--animo-danger-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  successIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'var(--animo-green-tint)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
