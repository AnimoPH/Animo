import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Database,
  FileText,
  Lock,
  Phone,
  TriangleAlert,
  X,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getLegalLinks } from '@/constants/dashboard';
import {
  fetchLguBarangayCoverage,
  fetchLguUserProfile,
  fetchRizalPriceHistory,
  formatRegisteredDate,
  formatSyncTimestamp,
  type PriceHistoryPoint,
} from '@/services/lgu-console-service';

export type SettingsPageProps = {
  onSignOut: () => void;
};

const LEGAL_ICONS = {
  file: FileText,
  lock: Lock,
  database: Database,
} as const;

/** Account details, language settings, security options and legal links for the LGU officer. */
export function SettingsPage({ onSignOut }: SettingsPageProps) {
  const { session } = useAuth();
  const { t, language, setLanguage, isTagalog } = useLanguage();
  const [contactNumber, setContactNumber] = useState<string>('—');
  const [registeredDate, setRegisteredDate] = useState<string>('—');
  const [barangayCoverage, setBarangayCoverage] = useState<string>('—');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Legal modal state
  const [selectedLegal, setSelectedLegal] = useState<{ title: string; subtitle: string; content: string } | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetchLguUserProfile(session.userId),
      fetchLguBarangayCoverage(),
      fetchRizalPriceHistory().catch(() => []),
    ])
      .then(([profile, barangays, history]) => {
        if (cancelled) return;
        if (profile) {
          setContactNumber(profile.contactNumber?.trim() || '—');
          setRegisteredDate(formatRegisteredDate(profile.dateRegistered, isTagalog));
        }
        setBarangayCoverage(
          barangays.length > 0 ? barangays.join(', ') : isTagalog ? 'Walang nakatala pa' : 'None recorded yet',
        );
        setPriceHistory(history);
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
  }, [session?.userId, isTagalog, t]);

  const fullName = session?.fullName ?? '—';
  const email = session?.email ?? '—';
  const initials = useMemo(
    () =>
      fullName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '—',
    [fullName],
  );

  const legalLinks = useMemo(() => getLegalLinks(language), [language]);

  const latestHistory = priceHistory.at(-1);
  const lastSyncTime = latestHistory ? formatSyncTimestamp(latestHistory.month, isTagalog) : (isTagalog ? 'Wala pa' : 'None');

  const appInfo = useMemo(() => [
    { label: isTagalog ? 'Bersyon' : 'Version', value: 'ANIMO LGU 1.4.0' },
    { label: isTagalog ? 'Huling sync ng presyo' : 'Latest price sync', value: lastSyncTime },
  ], [isTagalog, lastSyncTime]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError(isTagalog ? 'Dapat hindi bababa sa 6 na karakter ang password.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isTagalog ? 'Hindi magkatugma ang password.' : 'Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage(isTagalog ? 'Matagumpay na napalitan ang password.' : 'Password updated successfully.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : (isTagalog ? 'Hindi napalitan ang password.' : 'Failed to change password.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLegalClick = (linkKey: string) => {
    if (linkKey === 'terms') {
      setSelectedLegal({
        title: isTagalog ? 'Mga Tuntunin at Kundisyon' : 'Terms and Conditions',
        subtitle: 'ANIMO Agricultural Platform',
        content: isTagalog
          ? 'Ang ANIMO LGU Console ay nakalaan para sa mga awtorisadong opisyal ng Municipal Agriculture Office para sa pagsubaybay sa kalakalan, presyo, at pagpapatupad ng alituntunin sa merkado ng palay.'
          : 'The ANIMO LGU Console is intended for authorized Municipal Agriculture Office personnel for trade monitoring, price transparency, and marketplace policy enforcement.',
      });
    } else if (linkKey === 'privacy') {
      setSelectedLegal({
        title: isTagalog ? 'Patakaran sa Privacy' : 'Privacy Policy',
        subtitle: 'Data Privacy Act of 2012 (RA 10173)',
        content: isTagalog
          ? 'Ang lahat ng datos ng mga magsasaka, mamimili, at transaksyon ay protektado at pinoproseso lamang para sa layunin ng opisyal na tulong pansakahan at kaligtasan sa merkado.'
          : 'All farmer, buyer, and transaction records are protected and processed strictly for agricultural support, transparency, and market safety purposes.',
      });
    } else {
      setSelectedLegal({
        title: isTagalog ? 'Kasunduan sa Pagbabahagi ng Datos' : 'Data Sharing Agreement',
        subtitle: 'LGU · DA · PhilRice · PSA',
        content: isTagalog
          ? 'Ang paggamit ng impormasyon sa presyo at produksyon ay umaayon sa balangkas ng datos ng Kagawaran ng Pagsasaka at Philippine Statistics Authority.'
          : 'Farmgate benchmarks and production feeds comply with data sharing frameworks of the Department of Agriculture and Philippine Statistics Authority.',
      });
    }
  };

  return (
    <ConsoleLayout
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      onSignOut={onSignOut}>
      {toastMessage && (
        <div style={styles.toast}>
          <Check size={18} color="var(--animo-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {loading ? <p style={styles.loadNotice}>{t('common.loading')}</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>{t('settings.personalDetails')}</h2>
              <p style={styles.panelSubtitle}>{t('settings.personalSubtitle')}</p>
            </div>
            <button
              type="button"
              disabled
              style={{ ...styles.editButton, opacity: 0.5, cursor: 'not-allowed' }}
              title={t('common.comingSoon')}>
              {t('common.comingSoon')}
            </button>
          </div>

          <div style={styles.identity}>
            <span style={styles.avatarLarge}>{initials}</span>
            <div>
              <div style={styles.identityName}>{fullName}</div>
              <div style={styles.identityRole}>LGU Official · San Mateo, Rizal</div>
              <div style={styles.chipRow}>
                <span style={styles.chipVerified}>Verified LGU Account</span>
              </div>
            </div>
          </div>

          <dl style={styles.detailList}>
            <DetailRow label={t('settings.fullName')} value={fullName} />
            <DetailRow label={t('settings.position')} value="Municipal Agriculture Officer" />
            <DetailRow label={t('common.email')} value={email} />
            <DetailRow label={t('settings.contact')} value={contactNumber} />
            <DetailRow label={isTagalog ? 'Petsa ng Rehistro:' : 'Date Registered:'} value={registeredDate} />
            <DetailRow label={t('settings.office')} value="San Mateo, Rizal" />
            <DetailRow label={t('settings.coverage')} value={barangayCoverage} />
          </dl>

          {/* Language Preference Section */}
          <div style={{ marginTop: 16 }}>
            <h3 style={styles.sectionHeading}>{t('settings.languageSection')}</h3>
            <p style={{ ...styles.panelSubtitle, marginBottom: 12 }}>{t('settings.languageSubtitle')}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={() => setLanguage('tl')}
                style={{
                  ...styles.langCard,
                  ...(language === 'tl' ? styles.langCardActive : styles.langCardInactive),
                }}>
                <div style={styles.langCardTop}>
                  <span style={styles.langTitle}>{t('settings.tagalogOption')}</span>
                </div>
                <p style={styles.langDesc}>{t('settings.tagalogDesc')}</p>
              </button>

              <button
                type="button"
                onClick={() => setLanguage('en')}
                style={{
                  ...styles.langCard,
                  ...(language === 'en' ? styles.langCardActive : styles.langCardInactive),
                }}>
                <div style={styles.langCardTop}>
                  <span style={styles.langTitle}>{t('settings.englishOption')}</span>
                </div>
                <p style={styles.langDesc}>{t('settings.englishDesc')}</p>
              </button>
            </div>
          </div>

          <h3 style={{ ...styles.sectionHeading, marginTop: 24 }}>
            {isTagalog ? 'Seguridad' : 'Security'}
          </h3>
          <div style={styles.actionList}>
            <ActionRow
              icon={<Lock size={20} color="var(--animo-green)" />}
              title={isTagalog ? 'Palitan ang password' : 'Change password'}
              subtitle={
                isTagalog
                  ? 'I-update ang password para sa iyong LGU session'
                  : 'Update password for your LGU session'
              }
              onClick={() => setShowPasswordModal(true)}
            />
            <ActionRow
              icon={<Phone size={20} color="var(--animo-black-secondary)" />}
              title="Two-factor authentication"
              subtitle={
                isTagalog
                  ? 'Hindi pa available sa prototype'
                  : 'Not yet available in prototype'
              }
              disabled
            />
          </div>
        </article>

        <aside style={styles.sideColumn}>
          <article className="animo-card" style={styles.panel}>
            <div>
              <h2 style={styles.panelTitle}>{t('settings.legalSection')}</h2>
              <p style={styles.panelSubtitle}>{t('settings.legalSubtitle')}</p>
            </div>

            <div style={styles.actionList}>
              {legalLinks.map((link) => {
                const Icon = LEGAL_ICONS[link.icon];
                return (
                  <ActionRow
                    key={link.key}
                    icon={<Icon size={20} color="var(--animo-black-secondary)" />}
                    title={link.title}
                    subtitle={link.subtitle}
                    bordered
                    onClick={() => handleLegalClick(link.key)}
                  />
                );
              })}
            </div>

            <div>
              <h3 style={styles.sectionHeading}>{t('settings.appInfo')}</h3>
              <dl style={styles.detailList}>
                {appInfo.map((info) => (
                  <DetailRow
                    key={info.label}
                    label={info.label}
                    value={info.value}
                  />
                ))}
              </dl>
            </div>

            <button type="button" onClick={onSignOut} style={styles.signOutButton}>
              {t('nav.signOut')}
            </button>

            <div style={styles.warning}>
              <TriangleAlert
                size={18}
                color="var(--animo-danger)"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>
                {isTagalog
                  ? 'Kakailanganin mong mag-login muli para makita ang dashboard.'
                  : 'You will need to log in again to access the dashboard.'}
              </span>
            </div>
          </article>
        </aside>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div>
                <h2 style={styles.modalTitle}>
                  {isTagalog ? 'Palitan ang Password' : 'Change Password'}
                </h2>
                <p style={styles.modalSubtitle}>
                  {isTagalog ? 'Magtakda ng bagong password para sa iyong account' : 'Set a new password for your account'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={styles.modalForm}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  {isTagalog ? 'Bagong Password' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  {isTagalog ? 'Kumpirmahin ang Bagong Password' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
              </div>

              {passwordError && <p style={styles.formError}>{passwordError}</p>}

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={styles.cancelBtn}>
                  {isTagalog ? 'Kanselahin' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={styles.submitBtn}>
                  {passwordLoading
                    ? (isTagalog ? 'Ina-update...' : 'Updating...')
                    : (isTagalog ? 'I-save ang Password' : 'Save Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legal Info Modal */}
      {selectedLegal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHead}>
              <div>
                <h2 style={styles.modalTitle}>{selectedLegal.title}</h2>
                <p style={styles.modalSubtitle}>{selectedLegal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLegal(null)}
                style={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 0', lineHeight: '24px', color: 'var(--animo-black-secondary)' }}>
              <p>{selectedLegal.content}</p>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setSelectedLegal(null)}
                style={styles.submitBtn}>
                {isTagalog ? 'Naiintindihan Ko' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bordered?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.actionRow,
        ...(bordered ? styles.actionRowBordered : null),
        ...(disabled ? { opacity: 0.55, cursor: 'not-allowed' } : null),
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
  loadNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-black-secondary)',
    fontSize: 14,
  },
  errorNotice: {
    margin: '0 0 12px',
    color: 'var(--animo-danger)',
    fontSize: 14,
    fontWeight: 600,
  },
  toast: {
    position: 'fixed',
    top: 24,
    right: 24,
    background: 'var(--animo-surface)',
    border: '1px solid var(--animo-green)',
    borderRadius: 'var(--animo-radius-md)',
    padding: '12px 20px',
    boxShadow: 'var(--animo-shadow-md)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--animo-black)',
  },
  panel: { padding: 24 },
  panelHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 20,
    borderBottom: '1px solid var(--animo-border)',
  },
  panelTitle: { fontSize: 20, fontWeight: 700 },
  panelSubtitle: {
    fontSize: 14,
    color: 'var(--animo-muted)',
    marginTop: 4,
  },
  editButton: {
    padding: '8px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-surface)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--animo-muted)',
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '24px 0',
    borderBottom: '1px solid var(--animo-border)',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 22,
    flexShrink: 0,
  },
  identityName: { fontSize: 18, fontWeight: 700 },
  identityRole: {
    fontSize: 14,
    color: 'var(--animo-black-secondary)',
    marginTop: 2,
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
  },
  chipVerified: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--animo-green)',
    background: 'var(--animo-green-tint)',
    padding: '3px 8px',
    borderRadius: 'var(--animo-radius-pill)',
  },
  detailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    margin: '20px 0 0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    gap: 16,
  },
  detailLabel: { color: 'var(--animo-muted)', flexShrink: 0 },
  detailValue: {
    fontWeight: 600,
    color: 'var(--animo-black)',
    textAlign: 'right',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 700,
    margin: '20px 0 8px',
  },
  langCard: {
    padding: 14,
    borderRadius: 'var(--animo-radius-md)',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  langCardActive: {
    background: 'var(--animo-green-tint)',
    border: '2px solid var(--animo-green)',
  },
  langCardInactive: {
    background: 'var(--animo-surface)',
    border: '1px solid var(--animo-border)',
  },
  langCardTop: { display: 'flex', alignItems: 'center', gap: 8 },
  langTitle: { fontWeight: 700, fontSize: 14, color: 'var(--animo-black)' },
  langDesc: {
    fontSize: 12,
    color: 'var(--animo-muted)',
    marginTop: 4,
    lineHeight: '16px',
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--animo-radius-md)',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
  },
  actionRowBordered: {
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  actionText: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--animo-black)',
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'var(--animo-muted)',
    marginTop: 2,
  },
  signOutButton: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-danger-tint)',
    border: '1px solid rgba(220, 38, 38, 0.25)',
    color: 'var(--animo-danger)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 20,
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    background: 'var(--animo-danger-tint)',
    borderRadius: 'var(--animo-radius-md)',
    fontSize: 12,
    color: 'var(--animo-danger)',
    marginTop: 12,
    lineHeight: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 16,
  },
  modalCard: {
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    width: '100%',
    maxWidth: 480,
    padding: 24,
    boxShadow: 'var(--animo-shadow-lg)',
  },
  modalHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--animo-border)',
    paddingBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: 700 },
  modalSubtitle: { fontSize: 13, color: 'var(--animo-muted)', marginTop: 2 },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--animo-muted)',
    padding: 4,
  },
  modalForm: { marginTop: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--animo-black)' },
  input: {
    width: '100%',
    height: 40,
    padding: '0 12px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    fontSize: 14,
  },
  formError: { color: 'var(--animo-danger)', fontSize: 13, margin: '8px 0' },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTop: '1px solid var(--animo-border)',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-surface)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 18px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: 'var(--animo-white)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
