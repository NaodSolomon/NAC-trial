'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import {
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/AdminFormField';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getAdminSettings, updateAdminSettings } from './admin-settings.client';
import {
  settingsEditorSchema,
  settingsEditorValues,
  type SettingsEditorValues,
} from './admin-settings.schemas';

const SOCIAL_NETWORKS = ['facebook', 'instagram', 'youtube', 'linkedin', 'x', 'tiktok'] as const;

const LOCALIZED_FIELDS = [
  {
    key: 'openingHours',
    label: 'Opening hours',
    hint: 'One line, shown in the page header, for example Monday-Friday, 8:30-17:00.',
  },
  { key: 'tagline', label: 'Tagline', hint: 'A short motto. Optional.' },
  {
    key: 'footerAbout',
    label: 'Footer sentence',
    hint: 'One or two sentences about the organization, shown at the bottom of every page.',
  },
  {
    key: 'faqIntro',
    label: 'FAQ introduction',
    hint: 'One sentence under the FAQ page title.',
  },
  {
    key: 'donationNotice',
    label: 'Donations notice',
    hint: 'Shown on the donate page while online payment is not connected. Tell supporters how to help meanwhile.',
  },
] as const;
const LANGUAGES = [
  ['en', 'English'],
  ['am', 'Amharic'],
] as const;

export function SettingsAdmin() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SettingsEditorValues>({
    resolver: zodResolver(settingsEditorSchema),
  });

  useEffect(() => {
    const controller = new AbortController();
    void getAdminSettings(controller.signal)
      .then((settings) => {
        reset(settingsEditorValues(settings));
        setLoaded(true);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiRequestError(loadError) && loadError.status === 403) setForbidden(true);
        else setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reset]);

  async function onSubmit(values: SettingsEditorValues) {
    setError('');
    try {
      const updated = await updateAdminSettings(values);
      reset(settingsEditorValues(updated));
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.settings.all, type: 'active' });
      notify({
        title: 'Global settings saved',
        message: 'Public contact and social details are now current.',
      });
    } catch (saveError) {
      setError(`${getApiErrorMessage(saveError)} Your unsaved settings remain unchanged.`);
    }
  }

  if (forbidden) return <AdminAccessDenied />;
  return (
    <section aria-labelledby="settings-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Super administrator
      </p>
      <h1
        id="settings-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Public settings
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Global identity, language, contact, and social details used throughout the public website.
      </p>
      {loading ? (
        <div
          role="status"
          aria-label="Loading settings"
          className="bg-card mt-8 h-80 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
      ) : loaded ? (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Website identity and languages
            </legend>
            <AdminFormField
              label="Site name"
              maxLength={150}
              error={errors.siteName?.message}
              {...register('siteName')}
            />
            <AdminFormSelect
              label="Default language"
              error={errors.defaultLanguage?.message}
              {...register('defaultLanguage')}
            >
              {LANGUAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </AdminFormSelect>
            <fieldset className="md:col-span-2" aria-describedby="supportedLanguages-error">
              <legend className="text-heading mb-2 block font-semibold">
                Enabled public languages
              </legend>
              <div className="flex flex-wrap gap-5">
                {LANGUAGES.map(([value, label]) => (
                  <label
                    key={value}
                    htmlFor={`supportedLanguages-${value}`}
                    className="flex min-h-11 items-center gap-3"
                  >
                    <input
                      id={`supportedLanguages-${value}`}
                      type="checkbox"
                      value={value}
                      className="size-5"
                      {...register('supportedLanguages')}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.supportedLanguages?.message && (
                <p
                  id="supportedLanguages-error"
                  role="alert"
                  className="text-destructive mt-1 text-sm"
                >
                  {errors.supportedLanguages.message}
                </p>
              )}
            </fieldset>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Contact information
            </legend>
            <AdminFormField
              label="Contact email"
              type="email"
              maxLength={255}
              error={errors.contactEmail?.message}
              {...register('contactEmail')}
            />
            <AdminFormField
              label="Phone"
              type="tel"
              maxLength={50}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <div className="md:col-span-2">
              <AdminFormTextarea
                label="Address"
                maxLength={500}
                rows={3}
                error={errors.address?.message}
                {...register('address')}
              />
            </div>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Social links
            </legend>
            {SOCIAL_NETWORKS.map((network) => (
              <AdminFormField
                key={network}
                label={network.charAt(0).toUpperCase() + network.slice(1)}
                type="url"
                placeholder={`https://${network}.com/...`}
                maxLength={2048}
                error={errors.socialLinks?.[network]?.message}
                {...register(`socialLinks.${network}`)}
              />
            ))}
            <p className="text-foreground text-sm md:col-span-2">
              Only HTTPS links are accepted. Leave a field empty to remove that network from the
              public footer.
            </p>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Organization voice
            </legend>
            {LOCALIZED_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label={`${field.label} (English)`}
                  id={`localized-${field.key}-en`}
                  maxLength={500}
                  hint={field.hint}
                  error={errors.localizedText?.[field.key]?.en?.message}
                  {...register(`localizedText.${field.key}.en`)}
                />
                <AdminFormField
                  label={`${field.label} (Amharic)`}
                  id={`localized-${field.key}-am`}
                  maxLength={500}
                  error={errors.localizedText?.[field.key]?.am?.message}
                  {...register(`localizedText.${field.key}.am`)}
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-3">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Page banners
            </legend>
            {(['gallery', 'blog', 'events'] as const).map((pageKey) => (
              <Controller
                key={pageKey}
                control={control}
                name={`pageBanners.${pageKey}`}
                render={({ field }) => (
                  <MediaPicker
                    label={`${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} banner`}
                    id={`page-banner-${pageKey}`}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.pageBanners?.[pageKey]?.message}
                  />
                )}
              />
            ))}
            <p className="text-foreground text-sm md:col-span-3">
              The wide photos at the top of the gallery, blog, and events pages. A template photo is
              used when none is chosen.
            </p>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Sharing image
            </legend>
            <Controller
              control={control}
              name="defaultShareImageUrl"
              render={({ field }) => (
                <MediaPicker
                  label="Default sharing image"
                  id="settings-share-image"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.defaultShareImageUrl?.message}
                  hint="Shown when a page without its own image is shared on social media. 1200 by 630 pixels works best."
                />
              )}
            />
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            <Save aria-hidden="true" />
            {isSubmitting ? 'Saving…' : 'Save public settings'}
          </Button>
        </form>
      ) : (
        <p
          role="alert"
          className="mt-8 rounded-xl border border-red-300 bg-red-50 p-6 text-red-900"
        >
          {error || 'Settings could not be loaded.'}
        </p>
      )}
    </section>
  );
}
