import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CloudDrizzle,
  Database,
  Gavel,
  Layers,
  LogOut,
  Settings2,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import { AnimoMark } from '@/components/animo-mark';
import { useAuth } from '@/lib/auth-context';
import { NAV_ITEMS, TRIGGER_ALERTS } from '@/constants/dashboard';

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
  const officerInitials =
    session?.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '—';
  const officerName = session?.fullName ?? 'LGU Officer';

  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState(TRIGGER_ALERTS);
  const notifRef = useRef<HTMLDivElement>(null);

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

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
  };

  const getAlertIcon = (kind: string) => {
    switch (kind) {
      case 'severe':
      case 'moderate':
      case 'mild':
        return <CloudDrizzle size={18} color="var(--animo-danger)" />;
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
        <Link to="/dashboard" style={styles.sidebarBrandLink} title="Pumunta sa Dashboard">
          <AnimoMark size={44} tone="green" />
          <div>
            <div style={styles.sidebarBrandName}>ANIMO</div>
            <div style={styles.sidebarBrandSub}>LGU Console</div>
          </div>
        </Link>

        <div style={styles.navSection}>
          <div style={styles.navHeading}>MENU</div>
          <nav style={styles.nav}>
            {NAV_ITEMS.map((item) => {
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
          <Link to="/settings" style={styles.sidebarUserLink} title="Pumunta sa Mga Setting">
            <span style={styles.avatar}>{officerInitials}</span>
            <span>
              <span style={styles.userName}>{officerName}</span>
              <span style={styles.userRole}>LGU Official</span>
            </span>
          </Link>
          <button type="button" onClick={onSignOut} style={styles.signOut}>
            <LogOut size={20} />
            Mag-sign out
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
                aria-label="Mga notification">
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
                      <h3 style={styles.notifTitle}>Mga Abiso at Alerto</h3>
                      <p style={styles.notifSub}>
                        {unreadCount > 0
                          ? `${unreadCount} bagong abiso`
                          : 'Walang bagong abiso'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={styles.markReadBtn}
                          title="Markahan bilang nabasa">
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
                          <span style={styles.notifItemTime}>{alert.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.notifFooter}>
                    <Link
                      to="/messages"
                      onClick={() => setShowNotifications(false)}
                      style={styles.viewAllLink}>
                      Tingnan ang lahat ng mensahe &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action: Header Profile links directly to Settings */}
            <Link to="/settings" style={styles.topUserLink} title="Pumunta sa Mga Setting">
              <span style={styles.avatar}>{officerInitials}</span>
              <span>
                <span style={styles.userName}>{officerName}</span>
                <span style={styles.userRole}>LGU San Mateo, Rizal</span>
              </span>
            </Link>
          </div>
        </header>

        {children}
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
  notifItemTime: {
    fontSize: 11,
    color: 'var(--animo-muted)',
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
};
