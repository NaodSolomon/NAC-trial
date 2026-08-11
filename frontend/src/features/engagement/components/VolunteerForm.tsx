'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Language } from '@/lib/i18n';
import { publicFormError, submitVolunteer } from '../engagement.client';
import { volunteerFormSchema } from '../engagement.schemas';
import type { VolunteerFormValues } from '../engagement.types';
import { PublicFormField, PublicFormStatus, PublicFormTextarea } from './PublicFormField';

export function VolunteerForm({ language }: { language: Language }) {
  const schema = useMemo(() => volunteerFormSchema(language), [language]);
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VolunteerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { languageCode: language },
  });

  useEffect(() => () => request.current?.abort(), []);

  async function onSubmit(values: VolunteerFormValues) {
    if (inFlight.current) return;
    inFlight.current = true;
    request.current = new AbortController();
    setSuccess(null);
    setSubmitError(null);
    try {
      await submitVolunteer(values, request.current.signal);
      reset({ languageCode: language });
      setSuccess(
        language === 'am'
          ? 'የበጎ ፈቃደኝነት ጥያቄዎ ተልኳል። ቡድናችን ካስፈለገ ያነጋግርዎታል።'
          : 'Your volunteer application was submitted. Our team will contact you if an opportunity is suitable.',
      );
    } catch (error) {
      setSubmitError(publicFormError(error, language));
    } finally {
      inFlight.current = false;
      request.current = null;
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 sm:grid-cols-2">
      <input type="hidden" {...register('languageCode')} />
      <PublicFormField
        label={language === 'am' ? 'ስም' : 'Your name'}
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <PublicFormField
        label={language === 'am' ? 'ኢሜይል' : 'Email address'}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PublicFormField
        label={language === 'am' ? 'ስልክ' : 'Phone number'}
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <PublicFormField
        label={language === 'am' ? 'የፍላጎት ዘርፍ' : 'Area of interest'}
        hint={
          language === 'am' ? 'ለምሳሌ፦ ዝግጅቶች ወይም የቤተሰብ ድጋፍ' : 'For example: events or family support'
        }
        error={errors.roleInterest?.message}
        {...register('roleInterest')}
      />
      <div className="sm:col-span-2">
        <PublicFormTextarea
          label={
            language === 'am' ? 'ስለ ልምድዎና ፍላጎትዎ' : 'Tell us about your experience and interest'
          }
          rows={7}
          error={errors.message?.message}
          {...register('message')}
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary-hover min-h-12 rounded-lg px-8 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {isSubmitting
            ? language === 'am'
              ? 'በመላክ ላይ…'
              : 'Submitting…'
            : language === 'am'
              ? 'ጥያቄ ይላኩ'
              : 'Submit application'}
        </button>
      </div>
      <div className="sm:col-span-2">
        <PublicFormStatus success={success} error={submitError} />
      </div>
    </form>
  );
}
