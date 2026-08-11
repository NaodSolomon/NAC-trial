'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDollarSign } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Language } from '@/lib/i18n';
import { createDonation } from '../donation.client';
import { donationFormSchema, isSafeCheckoutUrl } from '../donation.schemas';
import type { DonationCapabilities, DonationFormValues } from '../donation.types';

const presetAmounts = [25, 50, 100, 250, 500];

export function DonationForm({
  capabilities,
  language,
}: {
  capabilities: DonationCapabilities;
  language: Language;
}) {
  const schema = useMemo(() => donationFormSchema(language), [language]);
  const inFlight = useRef(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(50);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DonationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 50, currency: 'USD' },
  });

  async function submit(values: DonationFormValues) {
    if (inFlight.current || !capabilities.canCreateDonation) return;
    const gateway = capabilities.gateways[0];
    if (!gateway) return;
    inFlight.current = true;
    setSubmitError(null);
    try {
      const result = await createDonation(values, gateway);
      const origin = window.location.origin;
      if (
        !isSafeCheckoutUrl(result.paymentUrl, capabilities.trialMode, result.donationId, origin)
      ) {
        setSubmitError(
          language === 'am'
            ? 'አገልጋዩ ደህንነቱ ያልተረጋገጠ የክፍያ አድራሻ መልሷል።'
            : 'The server returned an unapproved checkout address. The demonstration was stopped.',
        );
        return;
      }
      const checkout = new URL(result.paymentUrl, origin);
      window.location.assign(
        capabilities.trialMode
          ? `${checkout.pathname}${checkout.search}${checkout.hash}`
          : checkout.toString(),
      );
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-7">
      <fieldset>
        <legend className="text-heading mb-3 font-semibold">
          {language === 'am' ? 'መጠን ይምረጡ' : 'Select an amount'}
        </legend>
        <div className="flex flex-wrap gap-3">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={selectedPreset === amount}
              onClick={() => {
                setSelectedPreset(amount);
                setValue('amount', amount, { shouldValidate: true });
              }}
              className={
                selectedPreset === amount
                  ? 'bg-primary min-h-11 rounded-lg px-5 font-semibold text-white'
                  : 'bg-secondary-bg text-heading min-h-11 rounded-lg border px-5 font-semibold'
              }
            >
              {amount}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <DonationField
          label={language === 'am' ? 'ሌላ መጠን' : 'Custom amount'}
          type="number"
          inputMode="decimal"
          min="1"
          max="1000000"
          step="0.01"
          error={errors.amount?.message}
          {...register('amount', {
            valueAsNumber: true,
            onChange: () => setSelectedPreset(null),
          })}
        />
        <label className="block">
          <span className="text-heading mb-2 block font-semibold">
            {language === 'am' ? 'ምንዛሬ' : 'Currency'}
          </span>
          <select
            {...register('currency')}
            className="border-input focus:border-primary min-h-12 w-full rounded-lg border bg-white px-4"
          >
            <option value="USD">USD</option>
            <option value="ETB">ETB</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DonationField
          label={language === 'am' ? 'ስም' : 'Name'}
          autoComplete="name"
          error={errors.donorName?.message}
          {...register('donorName')}
        />
        <DonationField
          label={language === 'am' ? 'ኢሜይል' : 'Email address'}
          type="email"
          autoComplete="email"
          error={errors.donorEmail?.message}
          {...register('donorEmail')}
        />
      </div>

      <label className="block">
        <span className="text-heading mb-2 block font-semibold">
          {language === 'am' ? 'መልእክት (አማራጭ)' : 'Message (optional)'}
        </span>
        <textarea
          rows={4}
          {...register('message')}
          aria-invalid={Boolean(errors.message)}
          className="border-input focus:border-primary min-h-32 w-full resize-y rounded-lg border bg-white px-4 py-3"
        />
        {errors.message && (
          <span className="text-destructive mt-1 block text-sm">{errors.message.message}</span>
        )}
      </label>

      <div className="bg-secondary-bg flex items-start gap-3 rounded-lg border p-4">
        <CircleDollarSign aria-hidden="true" className="text-primary mt-0.5 size-5 shrink-0" />
        <p className="text-foreground text-sm">
          {capabilities.trialMode
            ? language === 'am'
              ? 'የውሸት ክፍያ መግቢያ ብቻ ይጠቀማል። ምንም የክፍያ መረጃ አይጠየቅም።'
              : 'The fake gateway will be used. No payment credentials are requested or stored.'
            : language === 'am'
              ? `የሚገኝ መግቢያ፦ ${capabilities.gateways.join(', ')}`
              : `Available gateway: ${capabilities.gateways.join(', ')}`}
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !capabilities.canCreateDonation}
        className="bg-primary hover:bg-primary-hover min-h-12 w-full rounded-lg px-6 text-lg font-semibold text-white disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting
          ? language === 'am'
            ? 'ማሳያውን በመፍጠር ላይ…'
            : 'Creating demonstration…'
          : capabilities.trialMode
            ? language === 'am'
              ? 'የሙከራ ልገሳ ይፍጠሩ'
              : 'Create trial donation'
            : language === 'am'
              ? 'ይቀጥሉ'
              : 'Continue to payment'}
      </button>
      {submitError && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4"
        >
          {submitError}
        </p>
      )}
    </form>
  );
}

function DonationField({
  label,
  error,
  name,
  ...props
}: {
  label: string;
  error?: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="text-heading mb-2 block font-semibold">{label}</span>
      <input
        {...props}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="border-input focus:border-primary min-h-12 w-full rounded-lg border bg-white px-4"
      />
      {error && (
        <span id={errorId} className="text-destructive mt-1 block text-sm">
          {error}
        </span>
      )}
    </label>
  );
}
