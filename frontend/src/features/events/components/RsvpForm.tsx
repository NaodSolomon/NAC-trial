'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PublicFormField } from '@/features/engagement/components/PublicFormField';
import { browserApiClient } from '@/lib/api/browser-client';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { rsvpConfirmationSchema, rsvpInputSchema } from '../event.schemas';

type RsvpInput = z.input<typeof rsvpInputSchema>;
type RsvpValues = z.output<typeof rsvpInputSchema>;

export function RsvpForm({ eventId, language }: { eventId: string; language: Language }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RsvpInput, unknown, RsvpValues>({
    resolver: zodResolver(rsvpInputSchema),
    defaultValues: { name: '', email: '', attendees: 1 },
  });

  async function onSubmit(values: RsvpValues) {
    setMessage(null);
    setError(null);
    try {
      const result = await browserApiClient.post(`/public/events/${eventId}/rsvp`, values);
      rsvpConfirmationSchema.parse(result);
      reset({ name: '', email: '', attendees: 1 });
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 grid gap-5 sm:grid-cols-2"
      >
        <PublicFormField
          label={language === 'am' ? 'ስም' : 'Name'}
          error={errors.name?.message}
          {...register('name')}
        />
        <PublicFormField
          label={language === 'am' ? 'ኢሜይል' : 'Email'}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PublicFormField
          label={language === 'am' ? 'የተሳታፊዎች ብዛት' : 'Number of attendees'}
          type="number"
          min={1}
          max={20}
          error={errors.attendees?.message}
          {...register('attendees', { valueAsNumber: true })}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary-hover min-h-12 self-end rounded-lg px-6 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting
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
