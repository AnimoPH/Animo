import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Database,
  FileText,
  Lock,
  Phone,
  TriangleAlert,
} from 'lucide-react';

import { ConsoleLayout } from '@/components/console-layout';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/auth-context';
import { getAppInfo, getLegalLinks } from '@/constants/dashboard';
import {
  fetchLguBarangayCoverage,
  fetchLguUserProfile,
  formatRegisteredDate,
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.userId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([fetchLguUserProfile(session.userId), fetchLguBarangayCoverage()])
      .then(([profile, barangays]) => {
        if (cancelled) return;
        if (profile) {
          setContactNumber(profile.contactNumber?.trim() || '—');
          setRegisteredDate(formatRegisteredDate(profile.dateRegistered, isTagalog));
        }
        setBarangayCoverage(
          barangays.length > 0 ? barangays.join(', ') : isTagalog ? 'Walang nakatala pa' : 'None recorded yet',
        );
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
  const appInfo = useMemo(() => getAppInfo(language), [language]);

  return (
    <ConsoleLayout
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      onSignOut={onSignOut}>
      {loading ? <p style={styles.loadNotice}>{t('common.loading')}</p> : null}
      {loadError ? <p style={styles.errorNotice}>{loadError}</p> : null}

      <div style={styles.grid}>
        <article className="animo-card" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>{t('settings.personalDetails')}</h2>
              <p style={styles.panelSubtitle}>{t('settings.personalSubtitle')}</p>
            </div>
            <button type="button" disabled style={{ ...styles.editButton, opacity: 0.5, cursor: 'not-allowed' }} title={t('common.comingSoon')}>
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
              icon={<Lock size={20} color="var(--animo-black-secondary)" />}
              title={isTagalog ? 'Palitan ang password' : 'Change password'}
              subtitle={
                isTagalog
                  ? 'Hindi pa naka-wire sa console — gamitin ang Supabase auth reset'
                  : 'Not yet wired in console — use Supabase auth reset'
              }
              disabled
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
              <p style={styles.panelSubtitle}>
                {t('settings.legalSubtitle')}
              </p>
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
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bordered?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
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
  langCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '16px',
    borderRadius: 'var(--animo-radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  langCardActive: {
    background: 'var(--animo-green-tint, #e8f5e9)',
    border: '2px solid var(--animo-green, #1e5a22)',
    boxShadow: '0 2px 8px rgba(30, 90, 34, 0.12)',
  },
  langCardInactive: {
    background: 'var(--animo-surface, #f9fafb)',
    border: '1px solid var(--animo-border, #e5e7eb)',
    opacity: 0.8,
  },
  langCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  langFlag: {
    fontSize: 20,
  },
  langTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--animo-black)',
  },
  langDesc: {
    margin: 0,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
    lineHeight: '18px',
  },
};
