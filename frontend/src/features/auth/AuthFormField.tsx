import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Input } from '@/components/ui/input';

export function AuthFormField({
  label,
  name,
  error,
  hint,
  id,
  className,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
} & ComponentPropsWithRef<'input'>) {
  const fieldId = id ?? name;
  const describedBy = [];
  if (error) describedBy.push(`${fieldId}-error`);
  else if (hint) describedBy.push(`${fieldId}-hint`);

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="text-heading block text-sm font-semibold">
        {label}
      </label>
      <Input
        {...props}
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy.length ? describedBy.join(' ') : undefined}
        className={className ?? 'min-h-11'}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-foreground text-xs leading-relaxed">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="text-destructive text-sm font-normal">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthFormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm"
    >
      {children}
    </p>
  );
}
