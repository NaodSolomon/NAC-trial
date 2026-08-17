import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface CommonProps {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  /** Current value length, shown against maxLength so editors can see remaining room. */
  counted?: string;
}

const controlClass =
  'border-input focus:border-primary focus:ring-primary/20 w-full rounded-lg border bg-white outline-none focus:ring-4 disabled:bg-slate-100';

function FieldShell({
  label,
  name,
  error,
  hint,
  counted,
  maxLength,
  children,
}: CommonProps & { maxLength?: number; children: ReactNode }) {
  const showCounter = counted !== undefined && maxLength !== undefined;
  return (
    <div>
      <label htmlFor={name} className="text-heading mb-2 flex justify-between font-semibold">
        <span>{label}</span>
        {showCounter && (
          <span className="text-foreground font-normal">
            {counted.length}/{maxLength}
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${name}-hint`} className="text-foreground mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-destructive mt-1 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(name: string, error?: string, hint?: ReactNode) {
  if (error) return `${name}-error`;
  return hint ? `${name}-hint` : undefined;
}

export function AdminFormField({
  label,
  name,
  error,
  hint,
  counted,
  className,
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell
      label={label}
      name={name}
      error={error}
      hint={hint}
      counted={counted}
      maxLength={props.maxLength}
    >
      <input
        {...props}
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(name, error, hint)}
        className={className ?? `${controlClass} min-h-12 px-4`}
      />
    </FieldShell>
  );
}

export function AdminFormTextarea({
  label,
  name,
  error,
  hint,
  counted,
  className,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell
      label={label}
      name={name}
      error={error}
      hint={hint}
      counted={counted}
      maxLength={props.maxLength}
    >
      <textarea
        {...props}
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(name, error, hint)}
        className={className ?? `${controlClass} resize-y p-4`}
      />
    </FieldShell>
  );
}

export function AdminFormSelect({
  label,
  name,
  error,
  hint,
  className,
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} name={name} error={error} hint={hint}>
      <select
        {...props}
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(name, error, hint)}
        className={className ?? `${controlClass} min-h-12 px-4`}
      >
        {children}
      </select>
    </FieldShell>
  );
}
