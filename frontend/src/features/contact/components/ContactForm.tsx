'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publicFormError, submitContact } from '@/features/engagement/engagement.client';
import { contactFormSchema } from '@/features/engagement/engagement.schemas';
import type { ContactFormValues } from '@/features/engagement/engagement.types';
import {
  PublicFormField,
  PublicFormStatus,
  PublicFormTextarea,
} from '@/features/engagement/components/PublicFormField';
import type { Language } from '@/lib/i18n';

export function ContactForm({ language }: { language: Language }) {
  const schema = useMemo(() => contactFormSchema(language), [language]);
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { languageCode: language },
  });

  useEffect(() => () => request.current?.abort(), []);

  async function onSubmit(values: ContactFormValues) {
    if (inFlight.current) return;
    inFlight.current = true;
    request.current = new AbortController();
    setSuccess(null);
    setSubmitError(null);
    try {
      await submitContact(values, request.current.signal);
      reset({ languageCode: language });
      setSuccess(
        language === 'am'
          ? 'መልእክትዎ ተልኳል። ቡድናችን በቀረበው መረጃ ያነጋግርዎታል።'
          : 'Your message was sent. Our team will respond using the information you provided.',
      );
    } catch (error) {
      setSubmitError(publicFormError(error, language));
    } finally {
      inFlight.current = false;
      request.current = null;
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <input type="hidden" {...register('languageCode')} />
      <PublicFormField
        label={language === 'am' ? 'ስም' : 'Your name'}
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <PublicFormField
        label={language === 'am' ? 'ኢሜይል' : 'Email address'}
        autoComplete="email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PublicFormField
        label={language === 'am' ? 'ርዕስ (አማራጭ)' : 'Subject (optional)'}
        error={errors.subject?.message}
        {...register('subject')}
      />
      <PublicFormTextarea
        label={language === 'am' ? 'መልእክት' : 'Message'}
        rows={6}
        error={errors.message?.message}
        {...register('message')}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary hover:bg-primary-hover min-h-12 rounded-lg px-8 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting
          ? language === 'am'
            ? 'በመላክ ላይ…'
            : 'Sending…'
          : language === 'am'
            ? 'መልእክት ይላኩ'
            : 'Send message'}
      </button>
      <PublicFormStatus success={success} error={submitError} />
    </form>
  );
}
