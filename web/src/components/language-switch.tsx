import { useLanguage } from '@/hooks/use-language';

export type LanguageSwitchProps = {
  variant?: 'pill' | 'header' | 'compact' | 'login';
  className?: string;
};

/**
 * Clean, flat bilingual Language Switcher for Animo LGU Web Console.
 * Strictly without emojis or drop-shadows, matching the design system.
 */
export function LanguageSwitch({ variant = 'login' }: LanguageSwitchProps) {
  const { setLanguage, isTagalog } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => setLanguage(isTagalog ? 'en' : 'tl')}
        style={styles.compactBtn}
        title={isTagalog ? 'Switch to English' : 'Lumipat sa Tagalog'}>
        <span style={styles.compactLabel}>
          {isTagalog ? 'Tagalog' : 'English'}
        </span>
      </button>
    );
  }

  return (
    <div style={styles.pillGroup} role="group" aria-label="Language Selector">
      <button
        type="button"
        onClick={() => setLanguage('tl')}
        style={{
          ...styles.pillBtn,
          ...(isTagalog ? styles.pillBtnActive : styles.pillBtnInactive),
        }}
        title="Tagalog">
        Tagalog
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={{
          ...styles.pillBtn,
          ...(!isTagalog ? styles.pillBtnActive : styles.pillBtnInactive),
        }}
        title="English">
        English
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pillGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--animo-surface, #f3f4f6)',
    border: '1px solid var(--animo-border, #e5e7eb)',
    borderRadius: 'var(--animo-radius-md, 8px)',
    padding: '3px',
    gap: '2px',
  },
  pillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  pillBtnActive: {
    background: 'var(--animo-green, #1e5a22)',
    color: '#ffffff',
  },
  pillBtnInactive: {
    background: 'transparent',
    color: 'var(--animo-black-secondary, #4b5563)',
  },
  compactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    background: 'var(--animo-surface, #ffffff)',
    border: '1px solid var(--animo-border, #e5e7eb)',
    borderRadius: 'var(--animo-radius-md, 8px)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--animo-black, #111827)',
  },
  compactLabel: {
    fontWeight: 600,
  },
};
