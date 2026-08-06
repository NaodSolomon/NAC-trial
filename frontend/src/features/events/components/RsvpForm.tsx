'use client';

import { useState, type FormEvent } from 'react';
import { browserApiClient } from '@/lib/api/browser-client';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { rsvpConfirmationSchema, rsvpInputSchema } from '../event.schemas';

type FieldErrors = Partial<Record<'name' | 'email' | 'attendees', string>>;

export function RsvpForm({ eventId, language }: { eventId: string; language: Language }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = rsvpInputSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      attendees: formData.get('attendees'),
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flattened.name?.[0],
        email: flattened.email?.[0],
        attendees: flattened.attendees?.[0],
      });
      return;
    }

    setPending(true);
    setFieldErrors({});
    try {
      const result = await browserApiClient.post<unknown>(
        `/public/events/${eventId}/rsvp`,
        parsed.data,
      );
      rsvpConfirmationSchema.parse(result);
      form.reset();
      setMessage(
        language === 'am'
          ? 'ምዝገባዎ ተረጋግጧል። በዝግጅቱ ላይ እንገናኝ።'
          : 'Your RSVP is confirmed. We look forward to seeing you.',
      );
    } catch (submitError) {
      setError(
        isApiRequestError(submitError) && submitError.kind === 'CONFLICT'
          ? language === 'am'
            ? 'ይህ ኢሜይል ለዚህ ዝግጅት አስቀድሞ ተመዝግቧል።'
            : 'This email is already registered for this event. No second RSVP was created.'
          : getApiErrorMessage(submitError),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="rsvp-heading">
      <h2 id="rsvp-heading" className="text-heading text-2xl font-semibold">
        {language === 'am' ? 'ለዝግጅቱ ይመዝገቡ' : 'RSVP for this event'}
      </h2>
      <p className="text-foreground mt-2">
        {language === 'am' ? 'የተሳታፊዎችን ብዛት ያሳውቁን።' : 'Let us know how many people will attend.'}
      </p>
      <form onSubmit={submit} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={language === 'am' ? 'ስም' : 'Name'} name="name" error={fieldErrors.name} />
        <Field
          label={language === 'am' ? 'ኢሜይል' : 'Email'}
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          label={language === 'am' ? 'የተሳታፊዎች ብዛት' : 'Number of attendees'}
          name="attendees"
          type="number"
          min={1}
          max={20}
          defaultValue="1"
          error={fieldErrors.attendees}
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-primary hover:bg-primary-hover min-h-12 self-end rounded-lg px-6 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {pending
            ? language === 'am'
              ? 'በመላክ ላይ…'
              : 'Submitting…'
            : language === 'am'
              ? 'ምዝገባውን ያረጋግጡ'
              : 'Confirm RSVP'}
        </button>
      </form>
      {message && (
        <p
          role="status"
          className="mt-5 rounded-lg border border-green-300 bg-green-50 p-4 text-green-900"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-5 rounded-lg border p-4"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  name,
  error,
  ...input
}: {
  label: string;
  name: 'name' | 'email' | 'attendees';
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  const errorId = name + '-error';
  return (
    <label className="block">
      <span className="text-heading mb-2 block font-semibold">{label}</span>
      <input
        {...input}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="border-input min-h-12 w-full rounded-lg border bg-white px-4"
      />
      {error && (
        <span id={errorId} className="text-destructive mt-1 block text-sm">
          {error}
        </span>
      )}
    </label>
  );
}
