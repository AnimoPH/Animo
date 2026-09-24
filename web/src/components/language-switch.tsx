import { Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

export type LanguageSwitchProps = {
  variant?: 'pill' | 'header' | 'compact' | 'login';
  className?: string;
};

/**
 * Interactive bilingual Language Switcher for Animo LGU Web Console.
 * Allows quick one-click toggle between Tagalog (default) and English.
 */
export function LanguageSwitch({ variant = 'header' }: LanguageSwitchProps) {
  const { setLanguage, isTagalog } = useLanguage();

  if (variant === 'login') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.pillGroup} role="group" aria-label="Language Selector">
          <button
            type="button"
            onClick={() => setLanguage('tl')}
            style={{
              ...styles.pillBtn,
              ...(isTagalog ? styles.pillBtnActive : styles.pillBtnInactive),
            }}
            title="Tagalog (Pangunahing Wika)">
            <span style={styles.flag}>🇵🇭</span>
            <span>Tagalog</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            style={{
              ...styles.pillBtn,
              ...(!isTagalog ? styles.pillBtnActive : styles.pillBtnInactive),
            }}
            title="English">
            <span style={styles.flag}>🌐</span>
            <span>English</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => setLanguage(isTagalog ? 'en' : 'tl')}
        style={styles.compactBtn}
        title={isTagalog ? 'Switch to English' : 'Lumipat sa Tagalog'}>
        <Globe size={15} color="var(--animo-green)" />
        <span style={styles.compactLabel}>
          {isTagalog ? '🇵🇭 TL' : '🌐 EN'}
        </span>
      </button>
    );
  }

  return (
    <div style={styles.headerContainer} role="group" aria-label="Wika / Language">
      <button
        type="button"
        onClick={() => setLanguage('tl')}
        style={{
          ...styles.toggleSegment,
          ...(isTagalog ? styles.toggleSegmentActive : styles.toggleSegmentInactive),
        }}
        title="Tagalog (Filipino)">
        <span style={styles.flagEmoji}>🇵🇭</span>
        <span style={styles.segmentText}>Tagalog</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={{
          ...styles.toggleSegment,
          ...(!isTagalog ? styles.toggleSegmentActive : styles.toggleSegmentInactive),
        }}
        title="English">
        <span style={styles.flagEmoji}>🌐</span>
        <span style={styles.segmentText}>English</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(238, 244, 238, 0.95)',
    border: '1px solid var(--animo-border, #d1dfd1)',
    borderRadius: '9999px',
    padding: '3px',
    gap: '2px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s ease',
  },
  toggleSegment: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '9999px',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
  },
  toggleSegmentActive: {
    background: 'var(--animo-green, #1e5a22)',
    color: '#ffffff',
    boxShadow: '0 2px 6px rgba(30, 90, 34, 0.25)',
  },
  toggleSegmentInactive: {
    background: 'transparent',
    color: 'var(--animo-black-secondary, #4b5563)',
    opacity: 0.85,
  },
  flagEmoji: {
    fontSize: '0.9rem',
    lineHeight: 1,
  },
  segmentText: {
    letterSpacing: '0.01em',
  },
  compactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'var(--animo-surface, #ffffff)',
    border: '1px solid var(--animo-border, #d1dfd1)',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--animo-black, #111827)',
    transition: 'all 0.2s ease',
  },
  compactLabel: {
    fontWeight: 700,
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  pillGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '9999px',
    padding: '4px',
    gap: '4px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '9999px',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  pillBtnActive: {
    background: 'var(--animo-green, #1e5a22)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(30, 90, 34, 0.3)',
  },
  pillBtnInactive: {
    background: 'transparent',
    color: '#374151',
  },
  flag: {
    fontSize: '0.9rem',
  },
};
