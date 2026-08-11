'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getAdminSettings, updateAdminSettings } from './admin-settings.client';
import {
  settingsEditorSchema,
  settingsEditorValues,
  type SettingsEditorValues,
} from './admin-settings.schemas';

export function SettingsAdmin() {
  const [values, setValues] = useState<SettingsEditorValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  useEffect(() => {
    const controller = new AbortController();
    void getAdminSettings(controller.signal)
      .then((settings) => setValues(settingsEditorValues(settings)))
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiRequestError(loadError) && loadError.status === 403) setForbidden(true);
        else setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function save() {
    if (!values) return;
    const parsed = settingsEditorSchema.safeParse(values);
    if (!parsed.success) {
      setError([...new Set(parsed.error.issues.map((issue) => issue.message))].join(' '));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateAdminSettings(parsed.data);
      setValues(settingsEditorValues(updated));
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.settings.all, type: 'active' });
      notify({
        title: 'Global settings saved',
        message: 'Public contact and social details are now current.',
      });
    } catch (saveError) {
      setError(`${getApiErrorMessage(saveError)} Your unsaved settings remain unchanged.`);
    } finally {
      setSaving(false);
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
      ) : values ? (
        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          noValidate
        >
          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Website identity and languages
            </legend>
            <Field
              label="Site name"
              value={values.siteName}
              maxLength={150}
              onChange={(siteName) => setValues({ ...values, siteName })}
            />
            <label className="block">
              <span className="text-heading mb-2 block text-sm font-semibold">
                Default language
              </span>
              <select
                value={values.defaultLanguage}
                onChange={(event) =>
                  setValues({ ...values, defaultLanguage: event.target.value as 'en' | 'am' })
                }
                className="min-h-11 w-full rounded-lg border bg-white px-3"
              >
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <span className="text-heading mb-2 block text-sm font-semibold">
                Enabled public languages
              </span>
              <div className="flex flex-wrap gap-5">
                {(['en', 'am'] as const).map((language) => (
                  <label key={language} className="flex min-h-11 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={values.supportedLanguages.includes(language)}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          supportedLanguages: event.target.checked
                            ? [...new Set([...values.supportedLanguages, language])]
                            : values.supportedLanguages.filter((item) => item !== language),
                        })
                      }
                      className="size-5"
                    />
                    {language === 'en' ? 'English' : 'Amharic'}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Contact information
            </legend>
            <Field
              label="Contact email"
              type="email"
              value={values.contactEmail}
              maxLength={255}
              onChange={(contactEmail) => setValues({ ...values, contactEmail })}
            />
            <Field
              label="Phone"
              type="tel"
              value={values.phone}
              maxLength={50}
              onChange={(phone) => setValues({ ...values, phone })}
            />
            <label className="block md:col-span-2">
              <span className="text-heading mb-2 block text-sm font-semibold">Address</span>
              <textarea
                value={values.address}
                maxLength={500}
                rows={3}
                onChange={(event) => setValues({ ...values, address: event.target.value })}
                className="w-full rounded-lg border p-3"
              />
            </label>
          </fieldset>

          <fieldset className="bg-card grid gap-5 rounded-xl border p-6 shadow-sm md:grid-cols-2">
            <legend className="text-heading px-2 font-serif text-xl font-semibold">
              Social links
            </legend>
            {(['facebook', 'instagram', 'youtube', 'linkedin'] as const).map((network) => (
              <Field
                key={network}
                label={network.charAt(0).toUpperCase() + network.slice(1)}
                type="url"
                placeholder={`https://${network}.com/...`}
                value={values.socialLinks[network]}
                maxLength={2048}
                onChange={(url) =>
                  setValues({ ...values, socialLinks: { ...values.socialLinks, [network]: url } })
                }
              />
            ))}
            <p className="text-foreground text-sm md:col-span-2">
              Only HTTPS links are accepted. Leave a field empty to remove that network from the
              public footer.
            </p>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            <Save aria-hidden="true" />
            {saving ? 'Saving…' : 'Save public settings'}
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength: number;
}) {
  return (
    <label className="block">
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}
