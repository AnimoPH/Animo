import { useEffect, useId, useRef } from 'react';

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button, for actions like signing out. */
  destructive?: boolean;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared confirmation modal. Backdrop click and Escape cancel; focus starts on Cancel
 * (the safe choice), stays inside the dialog while open, and returns to the trigger on close.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  // Kept in a ref so the key listener below doesn't re-subscribe when the parent re-renders.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Capture phase + stopPropagation: Escape closes only this dialog, not a drawer behind it.
        e.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      trigger?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        style={styles.card}>
        <h2 id={titleId} style={styles.title}>
          {title}
        </h2>
        <p id={messageId} style={styles.message}>
          {message}
        </p>
        <div style={styles.footer}>
          <button ref={cancelRef} type="button" onClick={onCancel} style={styles.cancelButton}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ ...styles.confirmButton, background: destructive ? 'var(--animo-danger)' : 'var(--animo-green)' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Matches the dashboard's NFA confirmation modal (overlay, card, title, text, footer buttons).
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Above the mobile sidebar drawer (1000/1001), so it works when opened from inside it.
    zIndex: 2000,
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: 'var(--animo-white)',
    borderRadius: 'var(--animo-radius-lg)',
    padding: 26,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
  },
  title: { margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--animo-black)' },
  message: {
    margin: 0,
    fontSize: 15,
    lineHeight: '22px',
    color: 'var(--animo-black-secondary)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    minHeight: 44,
    padding: '12px 20px',
    borderRadius: 'var(--animo-radius-md)',
    border: '1px solid var(--animo-border)',
    background: 'transparent',
    color: 'var(--animo-black)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButton: {
    minHeight: 44,
    padding: '12px 22px',
    borderRadius: 'var(--animo-radius-md)',
    border: 'none',
    color: 'var(--animo-white)',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
