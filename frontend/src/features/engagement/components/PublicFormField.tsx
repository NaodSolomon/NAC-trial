import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface CommonProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function PublicFormField({
  label,
  name,
  error,
  hint,
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <label className="block">
      <span className="text-heading mb-2 block font-semibold">{label}</span>
      <input
        {...props}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className="border-input focus:border-primary focus:ring-primary/20 min-h-12 w-full rounded-lg border bg-white px-4 outline-none focus:ring-4"
      />
      {hint && !error && (
        <span id={hintId} className="text-foreground mt-1 block text-sm">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-destructive mt-1 block text-sm">
          {error}
        </span>
      )}
    </label>
  );
}

export function PublicFormTextarea({
  label,
  name,
  error,
  hint,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <label className="block">
      <span className="text-heading mb-2 block font-semibold">{label}</span>
      <textarea
        {...props}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className="border-input focus:border-primary focus:ring-primary/20 min-h-36 w-full resize-y rounded-lg border bg-white px-4 py-3 outline-none focus:ring-4"
      />
      {hint && !error && (
        <span id={hintId} className="text-foreground mt-1 block text-sm">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-destructive mt-1 block text-sm">
          {error}
        </span>
      )}
    </label>
  );
}

export function PublicFormStatus({
  success,
  error,
}: {
  success: string | null;
  error: string | null;
}) {
  if (success) {
    return (
      <p
        role="status"
        className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-900"
      >
        {success}
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4"
      >
        {error}
      </p>
    );
  }
  return null;
}
