import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  CloudDrizzle,
  Layers,
  LogOut,
  Settings2,
  Users,
} from 'lucide-react';

import { AnimoMark } from '@/components/animo-mark';
import { NAV_ITEMS } from '@/constants/dashboard';

const NAV_ICONS = {
  dashboard: Layers,
  advisory: CloudDrizzle,
  messages: Bell,
  farmers: Users,
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

/** Sidebar shell shared by every LGU Console page. */
export function ConsoleLayout({
  title,
  subtitle,
  onSignOut,
  children,
}: ConsoleLayoutProps) {
  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <AnimoMark size={40} tone="green" />
          <div>
            <div style={styles.sidebarBrandName}>ANIMO</div>
            <div style={styles.sidebarBrandSub}>LGU Console</div>
          </div>
        </div>

        <div style={styles.navSection}>
          <div style={styles.navHeading}>MENU</div>
          <nav style={styles.nav}>
            {NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.key];
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
                        size={20}
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
          <div style={styles.userRow}>
            <span style={styles.avatar}>MR</span>
            <span>
              <span style={styles.userName}>Ma. Reyes</span>
              <span style={styles.userRole}>Agri Officer</span>
            </span>
          </div>
          <button type="button" onClick={onSignOut} style={styles.signOut}>
            <LogOut size={18} />
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
          <div style={styles.topBarActions}>
            <button
              type="button"
              style={styles.iconButton}
              aria-label="Mga notification">
              <Bell size={18} color="var(--animo-black-secondary)" />
            </button>
            <div style={styles.topUser}>
              <span style={styles.avatar}>MR</span>
              <span>
                <span style={styles.userName}>Ma. Reyes</span>
                <span style={styles.userRole}>LGU San Mateo</span>
              </span>
            </div>
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
    gridTemplateColumns: '244px 1fr',
    minHeight: '100vh',
    background: 'var(--animo-canvas)',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '20px 16px',
    background: 'var(--animo-white)',
    borderRight: '1px solid var(--animo-border)',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  sidebarBrandName: { fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
  sidebarBrandSub: { fontSize: 12, color: 'var(--animo-muted)' },
  navSection: { flex: 1 },
  navHeading: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: 'var(--animo-muted)',
    padding: '0 8px 10px',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'transparent',
    textAlign: 'left',
    textDecoration: 'none',
    color: 'var(--animo-black)',
  },
  navItemActive: { background: 'var(--animo-green-tint)' },
  navLabel: { display: 'block', fontSize: 14, fontWeight: 600 },
  navSublabel: { display: 'block', fontSize: 11, color: 'var(--animo-muted)' },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    borderTop: '1px solid var(--animo-border)',
    paddingTop: 16,
  },
  userRow: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 'var(--animo-radius-pill)',
    background: 'var(--animo-green-tint)',
    color: 'var(--animo-green)',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: { display: 'block', fontSize: 13, fontWeight: 600 },
  userRole: { display: 'block', fontSize: 11, color: 'var(--animo-muted)' },
  signOut: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 'var(--animo-radius-md)',
    background: 'transparent',
    color: 'var(--animo-danger)',
    fontSize: 14,
    fontWeight: 600,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '24px 28px 40px',
    minWidth: 0,
  },
  topBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  pageTitle: { margin: '0 0 4px', fontSize: 24, fontWeight: 700 },
  pageSubtitle: {
    margin: 0,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  topBarActions: { display: 'flex', alignItems: 'center', gap: 12 },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'var(--animo-white)',
  },
  topUser: { display: 'flex', alignItems: 'center', gap: 10 },
};
