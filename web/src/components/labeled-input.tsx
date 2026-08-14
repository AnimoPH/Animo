import type { InputHTMLAttributes, ReactNode } from 'react';

export type LabeledInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Label above the field. */
  label?: string;
  /** Small helper text shown below the field. */
  hint?: string;
  /** Icon rendered inside the field on the left. */
  icon?: ReactNode;
  /** Element rendered inside the field on the right (e.g. a reveal toggle). */
  trailing?: ReactNode;
  /** Render the field in the error (red border) state. */
  error?: boolean;
};

/** Text field with an optional label above and helper text below. */
export function LabeledInput({
  label,
  hint,
  icon,
  trailing,
  error = false,
  id,
  ...rest
}: LabeledInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label ? (
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--animo-black)' }}>
          {label}
        </label>
      ) : null}
      <div className={`animo-field${error ? ' animo-field--error' : ''}`}>
        {icon}
        <input id={id} {...rest} />
        {trailing}
      </div>
      {hint ? (
        <span
          style={{
            fontSize: 12,
            lineHeight: '16px',
            color: error ? 'var(--animo-danger)' : 'var(--animo-muted)',
          }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
