import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Bell,
  CloudDrizzle,
  Layers,
  LogOut,
  Settings2,
  ShoppingBag,
  Users,
} from 'lucide-react';

import { AnimoMark } from '@/components/animo-mark';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/lib/auth-context';

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

/** Sidebar shell shared by every LGU Console page with quick actions. */
export function ConsoleLayout({
  title,
  subtitle,
  onSignOut,
  children,
}: ConsoleLayoutProps) {
  const { session } = useAuth();
  const { t } = useLanguage();

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
  // `session` carries no role/office field (only userId, email, fullName); every
  // signed-in user is an LGU_Official of this LGU, so both identity blocks share one line.
  const officerRoleLine = 'LGU Antipolo, Rizal';

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
              <span style={styles.userRole}>{officerRoleLine}</span>
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
          <div style={styles.topBarActions}>
            {/* Quick Action: Header Profile links directly to Settings */}
            <Link to="/settings" style={styles.topUserLink} title={t('nav.settings')}>
              <span style={styles.avatar}>{officerInitials}</span>
              <span>
                <span style={styles.userName}>{officerName}</span>
                <span style={styles.userRole}>{officerRoleLine}</span>
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
    minHeight: 44,
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
  topBarActions: { display: 'flex', alignItems: 'center' },
  topUserLink: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
    gap: 12,
    textDecoration: 'none',
    color: 'inherit',
    padding: '4px 10px',
    borderRadius: 'var(--animo-radius-md)',
    transition: 'background 120ms ease',
    cursor: 'pointer',
  },
};
