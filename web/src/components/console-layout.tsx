import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CloudDrizzle,
  CloudSun,
  Database,
  Gavel,
  Layers,
  LogOut,
  MapPin,
  Settings2,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import { AnimoMark } from '@/components/animo-mark';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/auth-context';
import { getTriggerAlerts, type TriggerAlert } from '@/constants/dashboard';

const NAV_ICONS = {
  dashboard: Layers,
  advisory: CloudDrizzle,
  messages: Bell,
  farmers: Users,
  buyers: ShoppingBag,
  settings: Settings2,
} as const;

export type ConsoleLayoutProps = {
  /** Page heading shown at the top of the content column. */
  title: string;
  /** Supporting line under the heading. */
  subtitle: string;
  onSignOut: () => void;
  children: ReactNode;
};

/** Sidebar shell shared by every LGU Console page with quick actions and notification popover. */
export function ConsoleLayout({
  title,
  subtitle,
  onSignOut,
  children,
}: ConsoleLayoutProps) {
  const { session } = useAuth();
  const { t, language, isTagalog } = useLanguage();

  const navItems = [
    { key: 'dashboard', label: t('nav.dashboard'), sublabel: t('nav.dashboardSub'), path: '/dashboard' },
    { key: 'advisory', label: t('nav.advisory'), sublabel: t('nav.advisorySub'), path: '/advisory' },
    { key: 'messages', label: t('nav.messages'), sublabel: t('nav.messagesSub'), path: '/messages' },
    { key: 'farmers', label: t('nav.farmers'), sublabel: t('nav.farmersSub'), path: '/farmers' },
    { key: 'buyers', label: t('nav.buyers'), sublabel: t('nav.buyersSub'), path: '/buyers' },
    { key: 'settings', label: t('nav.settings'), sublabel: t('nav.settingsSub'), path: '/settings' },
  ] as const;

  const officerInitials =
    session?.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '—';
  const officerName = session?.fullName ?? t('header.officer');

  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState(() => getTriggerAlerts(language));
  const [selectedAlert, setSelectedAlert] = useState<TriggerAlert | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAlerts(getTriggerAlerts(language));
  }, [language]);

  const unreadCount = alerts.filter((a) => a.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Handle escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedAlert(null);
      }
    }
    if (selectedAlert) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAlert]);

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
  };

  const handleAlertClick = (alert: TriggerAlert) => {
    // 1. Mark this specific alert as read (lowers unreadCount badge immediately)
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, unread: false } : a))
    );
    // 2. Open full message detail modal
    setSelectedAlert({ ...alert, unread: false });
    // 3. Close the dropdown popover
    setShowNotifications(false);
  };

  const getAlertIcon = (kind: string) => {
    switch (kind) {
      case 'severe':
      case 'moderate':
      case 'mild':
        return <CloudDrizzle size={18} color="var(--animo-danger)" />;
      case 'done':
        return <CloudSun size={18} color="var(--animo-green)" />;
      case 'nfa':
        return <Gavel size={18} color="var(--animo-green)" />;
      case 'psa':
        return <Database size={18} color="#2563EB" />;
      case 'price':
        return <TrendingUp size={18} color="var(--animo-warning)" />;
      default:
        return <Bell size={18} color="var(--animo-green)" />;
    }
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        {/* Quick Action: ANIMO brand links directly to Dashboard */}
        <Link to="/dashboard" style={styles.sidebarBrandLink} title={t('nav.dashboard')}>
          <AnimoMark size={44} tone="green" />
          <div>
            <div style={styles.sidebarBrandName}>ANIMO</div>
            <div style={styles.sidebarBrandSub}>{t('brand.console')}</div>
          </div>
        </Link>

        <div style={styles.navSection}>
          <div style={styles.navHeading}>MENU</div>
          <nav style={styles.nav}>
            {navItems.map((item) => {
              const Icon = NAV_ICONS[item.key as keyof typeof NAV_ICONS];
              return (
                <NavLink
                  key={item.key}
                  to={item.path}
                  style={({ isActive }) => ({
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : null),
                  })}>
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={22}
                        color={
                          isActive
                            ? 'var(--animo-green)'
                            : 'var(--animo-black-secondary)'
                        }
                      />
                      <span>
                        <span style={styles.navLabel}>{item.label}</span>
                        <span style={styles.navSublabel}>{item.sublabel}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          {/* Quick Action: Sidebar User links directly to Settings */}
          <Link to="/settings" style={styles.sidebarUserLink} title={t('nav.settings')}>
            <span style={styles.avatar}>{officerInitials}</span>
            <span>
              <span style={styles.userName}>{officerName}</span>
              <span style={styles.userRole}>LGU Official</span>
            </span>
          </Link>
          <button type="button" onClick={onSignOut} style={styles.signOut}>
            <LogOut size={20} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>{title}</h1>
            <p style={styles.pageSubtitle}>{subtitle}</p>
          </div>
          <div style={styles.topBarActions} ref={notifRef}>
            {/* Functional Notification Bell Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  ...styles.iconButton,
                  ...(showNotifications ? styles.iconButtonActive : null),
                }}
                aria-label={t('header.notifications')}>
                <Bell size={20} color="var(--animo-black)" />
                {unreadCount > 0 && (
                  <span style={styles.bellBadge}>{unreadCount}</span>
                )}
              </button>

              {/* Notification Window Dropdown Popover */}
              {showNotifications && (
                <div style={styles.notifPopover}>
                  <div style={styles.notifHeader}>
                    <div>
                      <h3 style={styles.notifTitle}>{t('header.notifications')}</h3>
                      <p style={styles.notifSub}>
                        {unreadCount > 0
                          ? `${unreadCount} ${t('header.unread')}`
                          : t('header.noNotifications')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={styles.markReadBtn}
                          title={t('header.markAllRead')}>
                          <CheckCheck size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        style={styles.closeNotifBtn}>
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div style={styles.notifList}>
                    {alerts.slice(0, 4).map((alert) => (
                      <div
                        key={alert.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleAlertClick(alert)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAlertClick(alert);
                          }
                        }}
                        style={{
                          ...styles.notifItem,
                          ...(alert.unread ? styles.notifItemUnread : null),
                        }}>
                        <span style={styles.notifIconWrap}>
                          {getAlertIcon(alert.kind)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.notifItemTitleRow}>
                            <span style={styles.notifItemTitle}>
                              {alert.title}
                            </span>
                            {alert.unread && (
                              <span style={styles.notifDot} />
                            )}
                          </div>
                          <p style={styles.notifItemBody}>{alert.body}</p>
                          <div style={styles.notifItemFooter}>
                            <span style={styles.notifItemTime}>{alert.time}</span>
                            <span style={styles.notifItemReadMore}>
                              {isTagalog ? 'Basahin \u2192' : 'Read details \u2192'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.notifFooter}>
                    <Link
                      to="/messages"
                      onClick={() => setShowNotifications(false)}
                      style={styles.viewAllLink}>
                      {t('header.viewAll')} &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action: Header Profile links directly to Settings */}
            <Link to="/settings" style={styles.topUserLink} title={t('nav.settings')}>
              <span style={styles.avatar}>{officerInitials}</span>
              <span>
                <span style={styles.userName}>{officerName}</span>
                <span style={styles.userRole}>LGU San Mateo, Rizal</span>
              </span>
            </Link>
          </div>
        </header>

        {children}

        {/* Full Message Detail Modal */}
        {selectedAlert && (
          <div
            style={styles.modalOverlay}
            onClick={() => setSelectedAlert(null)}>
            <div
              style={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true">
              <div style={styles.modalHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={styles.modalIconWrap}>
                    {getAlertIcon(selectedAlert.kind)}
                  </span>
                  <div>
                    <h2 style={styles.modalTitle}>{selectedAlert.title}</h2>
                    <span style={styles.modalBadge}>
                      {selectedAlert.badge}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  style={styles.closeBtn}
                  aria-label="Close modal">
                  <X size={20} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.metaBox}>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>
                      <MapPin size={15} color="var(--animo-muted)" /> {isTagalog ? 'Lokasyon:' : 'Location:'}
                    </span>
                    <span style={styles.metaValue}>{selectedAlert.barangay || 'San Mateo, Rizal'}</span>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>
                      <UserCheck size={15} color="var(--animo-muted)" /> {isTagalog ? 'Tumatanggap:' : 'Recipients:'}
                    </span>
                    <span style={styles.metaValue}>
                      {selectedAlert.recipientsCount || 38} {isTagalog ? 'rehistradong magsasaka / mamimili' : 'registered farmers / buyers'}
                    </span>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>{isTagalog ? 'Pinagmulan:' : 'Source / Origin:'}</span>
                    <span style={styles.metaValue}>
                      {selectedAlert.sender || 'PAGASA Doppler Sensor & LGU Weather System'}
                    </span>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>{isTagalog ? 'Oras ng Paglabas:' : 'Issued Time:'}</span>
                    <span style={styles.metaValue}>{selectedAlert.time}</span>
                  </div>
                </div>

                <div>
                  <h3 style={styles.detailSectionTitle}>
                    {isTagalog ? 'Buong Nilalaman ng Mensahe' : 'Full Message Body'}
                  </h3>
                  <p style={styles.fullMessageBody}>{selectedAlert.body}</p>
                </div>

                {selectedAlert.recommendations && selectedAlert.recommendations.length > 0 && (
                  <div>
                    <h3 style={styles.detailSectionTitle}>
                      {isTagalog ? 'Mga Inirerekomendang Aksyon' : 'Recommended Actions'}
                    </h3>
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
                  onClick={() => setSelectedAlert(null)}
                  style={styles.actionBtnPrimary}>
                  {isTagalog ? 'Isara' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    minHeight: '100vh',
    background: 'var(--animo-canvas)',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '24px 18px',
    background: 'var(--animo-white)',
    borderRight: '1px solid var(--animo-border)',
    position: 'sticky',
    top: 0,
    height: '100vh',
    boxShadow: '1px 0 3px rgba(0,0,0,0.03)',
  },
  sidebarBrandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
  },
  sidebarBrandName: { fontSize: 20, fontWeight: 800, letterSpacing: 0.5, color: 'var(--animo-green)' },
  sidebarBrandSub: { fontSize: 13, color: 'var(--animo-muted)', fontWeight: 600 },
  navSection: { flex: 1 },
  navHeading: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: 'var(--animo-muted)',
    padding: '0 10px 12px',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'transparent',
    textAlign: 'left',
    textDecoration: 'none',
    color: 'var(--animo-black)',
    transition: 'all 120ms ease',
  },
  navItemActive: {
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
  },
  navLabel: { display: 'block', fontSize: 15, fontWeight: 700 },
  navSublabel: { display: 'block', fontSize: 12, color: 'var(--animo-muted)' },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    borderTop: '1px solid var(--animo-border)',
    paddingTop: 18,
  },
  sidebarUserLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    color: 'inherit',
    padding: '6px 8px',
    borderRadius: 'var(--animo-radius-md)',
    transition: 'background 120ms ease',
    cursor: 'pointer',
  },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: { display: 'block', fontSize: 15, fontWeight: 700 },
  userRole: { display: 'block', fontSize: 12, color: 'var(--animo-muted)' },
  signOut: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    border: 'none',
    borderRadius: 'var(--animo-radius-md)',
    background: 'transparent',
    color: 'var(--animo-danger)',
    fontSize: 15,
    fontWeight: 700,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '28px 32px 48px',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 800 },
  pageSubtitle: {
    margin: 0,
    fontSize: 15,
    color: 'var(--animo-black-secondary)',
  },
  topBarActions: { display: 'flex', alignItems: 'center', gap: 16, position: 'relative' },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 'var(--animo-radius-md)',
    border: '1.5px solid var(--animo-border)',
    background: 'var(--animo-white)',
    position: 'relative',
  },
  iconButtonActive: {
    borderColor: 'var(--animo-green)',
    background: 'var(--animo-green-tint)',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: 'var(--animo-danger)',
    color: 'var(--animo-white)',
    fontSize: 11,
    fontWeight: 700,
    width: 18,
    height: 18,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifPopover: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 360,
    maxHeight: 480,
    background: 'var(--animo-white)',
    border: '1px solid var(--animo-border)',
    borderRadius: 'var(--animo-radius-lg)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid var(--animo-border)',
    background: 'var(--animo-surface)',
  },
  notifTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
  notifSub: { margin: '2px 0 0', fontSize: 12, color: 'var(--animo-muted)' },
  markReadBtn: {
    background: 'transparent',
    border: 'none',
    padding: 6,
    color: 'var(--animo-green)',
    borderRadius: 'var(--animo-radius-sm)',
  },
  closeNotifBtn: {
    background: 'transparent',
    border: 'none',
    padding: 4,
    color: 'var(--animo-muted)',
  },
  notifList: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    maxHeight: 340,
  },
  notifItem: {
    display: 'flex',
    gap: 12,
    padding: '14px 18px',
    borderBottom: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 120ms ease',
    userSelect: 'none',
  },
  notifItemUnread: {
    background: '#F7FCF7',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    background: 'var(--animo-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifItemTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--animo-black)',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    background: 'var(--animo-green)',
    flexShrink: 0,
  },
  notifItemBody: {
    margin: '4px 0 6px',
    fontSize: 13,
    lineHeight: '18px',
    color: 'var(--animo-black-secondary)',
  },
  notifItemFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  notifItemTime: {
    fontSize: 11,
    color: 'var(--animo-muted)',
  },
  notifItemReadMore: {
    fontSize: 11.5,
    fontWeight: 700,
    color: 'var(--animo-green)',
  },
  notifFooter: {
    padding: '12px 18px',
    background: 'var(--animo-surface)',
    textAlign: 'center',
    borderTop: '1px solid var(--animo-border)',
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--animo-green)',
    textDecoration: 'none',
  },
  topUserLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textDecoration: 'none',
    color: 'inherit',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-md)',
    transition: 'background 120ms ease',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
    backdropFilter: 'blur(2px)',
  },
  modalCard: {
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    width: '100%',
    maxWidth: 580,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--animo-border)',
    paddingBottom: 16,
    gap: 12,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'var(--animo-surface)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--animo-black)' },
  modalBadge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 8px',
    borderRadius: 'var(--animo-radius-pill)',
    fontSize: 12,
    fontWeight: 700,
    background: 'var(--animo-surface)',
    color: 'var(--animo-black-secondary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--animo-muted)',
    padding: 4,
    cursor: 'pointer',
    borderRadius: 'var(--animo-radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
  },
  metaLabel: {
    color: 'var(--animo-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  metaValue: {
    fontWeight: 700,
    color: 'var(--animo-black)',
    textAlign: 'right',
  },
  detailSectionTitle: {
    margin: '0 0 8px',
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--animo-black)',
  },
  fullMessageBody: {
    margin: 0,
    fontSize: 14,
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
    fontSize: 13.5,
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
    borderTop: '1px solid var(--animo-border)',
    paddingTop: 16,
  },
  actionBtnPrimary: {
    padding: '10px 24px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    background: 'var(--animo-green)',
    color: 'var(--animo-white)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
