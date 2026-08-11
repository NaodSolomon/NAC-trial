'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Language } from '@/lib/i18n';
import { publicFormError, subscribeNewsletter } from '../engagement.client';
import { newsletterFormSchema } from '../engagement.schemas';
import type { NewsletterFormValues } from '../engagement.types';

export function NewsletterSignup({ language }: { language: Language }) {
  const schema = useMemo(() => newsletterFormSchema(language), [language]);
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { languageCode: language },
  });

  useEffect(() => () => request.current?.abort(), []);

  async function onSubmit(values: NewsletterFormValues) {
    if (inFlight.current) return;
    inFlight.current = true;
    request.current = new AbortController();
    setSuccess(null);
    setSubmitError(null);
    try {
      await subscribeNewsletter(values, request.current.signal);
      reset({ languageCode: language });
      setSuccess(
        language === 'am'
          ? 'ምዝገባዎ ተጠናቋል። የማዕከሉን ዜና በኢሜይል ይቀበላሉ።'
          : 'You are subscribed. Updates from the center will be sent by email.',
      );
    } catch (error) {
      setSubmitError(publicFormError(error, language));
    } finally {
      inFlight.current = false;
      request.current = null;
    }
  }

  const errorId = 'newsletter-email-error';
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-xl">
      <input type="hidden" {...register('languageCode')} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          {language === 'am' ? 'ኢሜይል' : 'Email address'}
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={language === 'am' ? 'ኢሜይልዎን ያስገቡ' : 'Enter your email address'}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? errorId : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-lg bg-white px-4 text-gray-950 outline-none focus:ring-4 focus:ring-white/40"
          {...register('email')}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 rounded-lg bg-gray-950 px-7 font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting
            ? language === 'am'
              ? 'በመመዝገብ ላይ…'
              : 'Subscribing…'
            : language === 'am'
              ? 'ይመዝገቡ'
              : 'Subscribe'}
        </button>
      </div>
      {errors.email && (
        <p id={errorId} className="mt-2 text-sm font-medium text-white">
          {errors.email.message}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 rounded bg-white/15 p-3 text-sm text-white">
          {success}
        </p>
      )}
      {submitError && (
        <p role="alert" className="mt-3 rounded bg-red-950/70 p-3 text-sm text-white">
          {submitError}
        </p>
      )}
    </form>
  );
}
