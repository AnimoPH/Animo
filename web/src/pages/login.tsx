import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudDrizzle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  TrendingUp,
  Users,
} from 'lucide-react';

import { AnimoWordmark } from '@/components/animo-mark';
import { FarmBackdrop } from '@/components/farm-backdrop';
import { LabeledInput } from '@/components/labeled-input';
import { useAuth } from '@/lib/auth-context';
import {
  getDefaultLguCredentials,
  LguAuthError,
  signInLgu,
} from '@/services/lgu-auth-service';

const defaults = getDefaultLguCredentials();

const HIGHLIGHTS = [
  { icon: CloudDrizzle, label: 'Real-time na advisory kada barangay' },
  { icon: Users, label: 'Tugon ng magsasaka sa bawat payo' },
  { icon: TrendingUp, label: 'Benchmark ng presyo ng palay' },
];

/** LGU Console sign-in — Supabase email/password for LGU_Official accounts. */
export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState(defaults.email);
  const [password, setPassword] = useState(defaults.password);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInLgu(email.trim(), password);
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof LguAuthError ? err.message : 'Hindi makapag-login.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <aside style={styles.brandPanel}>
        <FarmBackdrop />
        <div style={styles.brandInner}>
          <AnimoWordmark height={52} />

          <div>
            <h1 style={styles.brandTitle}>LGU Console</h1>
            <p style={styles.brandSubtitle}>
              Pagsubaybay sa payo, tugon ng magsasaka, at presyo ng palay — sa
              isang dashboard.
            </p>
          </div>

          <ul style={styles.highlightList}>
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} style={styles.highlightItem}>
                <Icon size={18} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main style={styles.formPanel}>
        <form style={styles.form} onSubmit={handleSubmit}>
          <div>
            <h2 style={styles.formTitle}>Mag-login</h2>
            <p style={styles.formSubtitle}>
              Gamitin ang iyong opisyal na LGU email.
            </p>
          </div>

          <LabeledInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ma.reyes@sanmateo.gov.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<Mail size={18} color="var(--animo-muted)" />}
          />

          <LabeledInput
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<Lock size={18} color="var(--animo-muted)" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Itago ang password' : 'Ipakita ang password'}
                style={styles.reveal}>
                {showPassword ? (
                  <EyeOff size={18} color="var(--animo-muted)" />
                ) : (
                  <Eye size={18} color="var(--animo-muted)" />
                )}
              </button>
            }
          />

          <div style={styles.metaRow}>
            <label style={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                style={styles.checkbox}
              />
              Alalahanin ako
            </label>
            <a href="#reset" style={styles.forgotLink}>
              Nakalimutan ang password?
            </a>
          </div>

          <button type="submit" className="animo-button" disabled={submitting}>
            {submitting ? 'Naglo-login…' : 'Mag-login'}
          </button>

          {error ? <p style={styles.errorNotice}>{error}</p> : null}

          <div style={styles.notice}>
            <Lock size={14} color="var(--animo-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Dev default: {defaults.email} · parehong password sa mobile dev accounts.
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 5fr) minmax(360px, 7fr)',
    minHeight: '100vh',
    background: 'var(--animo-white)',
  },
  brandPanel: {
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--animo-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  brandInner: {
    // Sits above the decorative backdrop.
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    maxWidth: 380,
  },
  brandTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--animo-white)',
  },
  brandSubtitle: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'rgba(255,255,255,0.82)',
  },
  highlightList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  formPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    width: '100%',
    maxWidth: 380,
  },
  formTitle: {
    margin: '0 0 6px',
    fontSize: 24,
    fontWeight: 700,
  },
  formSubtitle: {
    margin: 0,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
  },
  reveal: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    padding: 0,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rememberLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--animo-black-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--animo-green)',
    cursor: 'pointer',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--animo-green)',
    textDecoration: 'none',
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 'var(--animo-radius-md)',
    background: 'var(--animo-surface)',
    fontSize: 12,
    lineHeight: '17px',
    color: 'var(--animo-black-secondary)',
  },
  errorNotice: {
    margin: 0,
    color: 'var(--animo-danger)',
    fontSize: 13,
    fontWeight: 600,
  },
};
