import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CmsEditorValues } from '../admin-cms.schemas';

type FieldMessages<T> = Partial<Record<keyof T, string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-destructive mt-1 text-sm">
      {message}
    </p>
  );
}

export function HomepageEditor({
  value,
  errors,
  onChange,
}: {
  value: CmsEditorValues['homepage'];
  errors?: FieldMessages<CmsEditorValues['homepage']>;
  onChange: (value: CmsEditorValues['homepage']) => void;
}) {
  const field = (name: keyof Omit<typeof value, 'services'>, label: string, maxLength: number) => {
    const id = `homepage-${name}`;
    const message = errors?.[name];
    return (
      <div className="block">
        <label htmlFor={id} className="text-heading mb-2 block text-sm font-semibold">
          {label}
        </label>
        <input
          id={id}
          value={String(value[name])}
          maxLength={maxLength}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(event) => onChange({ ...value, [name]: event.target.value })}
          className="min-h-11 w-full rounded-lg border px-3"
        />
        <FieldError id={`${id}-error`} message={message} />
      </div>
    );
  };
  return (
    <fieldset className="space-y-5 rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">Homepage composition</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('heroHeading', 'Hero heading', 180)}
        {field('heroBody', 'Hero body', 1_000)}
        {field('primaryLabel', 'Primary action label', 80)}
        {field('primaryHref', 'Primary action link', 2_048)}
        {field('servicesHeading', 'Services heading', 180)}
        {field('locationHeading', 'Location heading', 180)}
        {field('locationBody', 'Location description', 1_000)}
        {field('mapEmbedUrl', 'Google Maps embed URL', 2_048)}
        {field('ctaHeading', 'Call-to-action heading', 180)}
        {field('ctaBody', 'Call-to-action body', 1_000)}
        {field('ctaLabel', 'Call-to-action label', 80)}
        {field('ctaHref', 'Call-to-action link', 2_048)}
      </div>
      <div>
        <FieldError id="homepage-services-error" message={errors?.services} />
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-heading font-semibold">Services</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({ ...value, services: [...value.services, { title: '', body: '' }] })
            }
            disabled={value.services.length >= 12}
          >
            <Plus aria-hidden="true" /> Add service
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {value.services.map((service, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_auto]"
            >
              <label>
                <span className="sr-only">Service {index + 1} title</span>
                <input
                  aria-label={`Service ${index + 1} title`}
                  value={service.title}
                  maxLength={120}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      services: value.services.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item,
                      ),
                    })
                  }
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                  placeholder="Service title"
                />
              </label>
              <label>
                <span className="sr-only">Service {index + 1} description</span>
                <input
                  aria-label={`Service ${index + 1} description`}
                  value={service.body}
                  maxLength={500}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      services: value.services.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, body: event.target.value } : item,
                      ),
                    })
                  }
                  className="min-h-11 w-full rounded-lg border bg-white px-3"
                  placeholder="Service description"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                aria-label={`Remove service ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    services: value.services.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

export function AboutEditor({
  value,
  errors,
  onChange,
}: {
  value: CmsEditorValues['about'];
  errors?: FieldMessages<CmsEditorValues['about']>;
  onChange: (value: CmsEditorValues['about']) => void;
}) {
  return (
    <fieldset className="space-y-5 rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">About composition</legend>
      <ApprovalCheckbox
        checked={value.contentApproved}
        label="NAC has approved this mission, history, and services content for publication."
        onChange={(contentApproved) => onChange({ ...value, contentApproved })}
      />
      {(
        [
          ['missionHeading', 'Mission heading', 180],
          ['missionBody', 'Mission content', 5_000],
          ['historyHeading', 'History heading', 180],
          ['historyBody', 'Approved history content', 5_000],
        ] as const
      ).map(([name, label, maxLength]) => (
        <div key={name} className="block">
          <label
            htmlFor={`about-${name}`}
            className="text-heading mb-2 block text-sm font-semibold"
          >
            {label}
          </label>
          <textarea
            id={`about-${name}`}
            value={value[name]}
            maxLength={maxLength}
            rows={name.endsWith('Body') ? 5 : 2}
            aria-invalid={Boolean(errors?.[name])}
            aria-describedby={errors?.[name] ? `about-${name}-error` : undefined}
            onChange={(event) => onChange({ ...value, [name]: event.target.value })}
            className="w-full rounded-lg border p-3"
          />
          <FieldError id={`about-${name}-error`} message={errors?.[name]} />
        </div>
      ))}
      <StructuredListEditor
        title="Service overview"
        addLabel="Add service"
        error={errors?.services}
        value={value.services}
        maxItems={12}
        fields={[
          { key: 'title', label: 'Service title', maxLength: 120 },
          { key: 'body', label: 'Service description', maxLength: 500 },
        ]}
        onChange={(services) => onChange({ ...value, services })}
      />
    </fieldset>
  );
}

export function VolunteerRolesEditor({
  value,
  error,
  onChange,
}: {
  value: CmsEditorValues['volunteerRoles'];
  error?: string;
  onChange: (value: CmsEditorValues['volunteerRoles']) => void;
}) {
  return (
    <fieldset className="rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">Volunteer roles</legend>
      <StructuredListEditor
        title="Published role listings"
        addLabel="Add role"
        error={error}
        value={value}
        maxItems={20}
        fields={[
          { key: 'title', label: 'Role title', maxLength: 150 },
          { key: 'summary', label: 'Role summary', maxLength: 1_000 },
          { key: 'commitment', label: 'Commitment (optional)', maxLength: 300 },
        ]}
        onChange={onChange}
      />
    </fieldset>
  );
}

export function TeamMembersEditor({
  value,
  error,
  onChange,
  approved,
  onApprovalChange,
}: {
  value: CmsEditorValues['teamMembers'];
  error?: string;
  onChange: (value: CmsEditorValues['teamMembers']) => void;
  approved: boolean;
  onApprovalChange: (approved: boolean) => void;
}) {
  return (
    <fieldset className="rounded-xl border p-5">
      <legend className="text-heading px-2 font-semibold">Approved team biographies</legend>
      <p className="text-foreground mb-4 text-sm">
        Publish only names, roles and biographies approved by Nehemiah Autism Center in the selected
        language.
      </p>
      <ApprovalCheckbox
        checked={approved}
        label="NAC has approved every name, role, and biography in the selected language."
        onChange={onApprovalChange}
      />
      <StructuredListEditor
        title="Team members"
        addLabel="Add approved member"
        error={error}
        value={value}
        maxItems={50}
        fields={[
          { key: 'name', label: 'Name', maxLength: 150 },
          { key: 'role', label: 'Role', maxLength: 150 },
          { key: 'biography', label: 'Biography', maxLength: 2_000 },
        ]}
        onChange={onChange}
      />
    </fieldset>
  );
}

function ApprovalCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function StructuredListEditor<T extends Record<string, string>>({
  title,
  addLabel,
  value,
  maxItems,
  fields,
  error,
  onChange,
}: {
  title: string;
  addLabel: string;
  value: T[];
  maxItems: number;
  fields: Array<{ key: keyof T; label: string; maxLength: number }>;
  error?: string;
  onChange: (value: T[]) => void;
}) {
  const empty = () => Object.fromEntries(fields.map((field) => [field.key, ''])) as T;
  return (
    <div>
      <FieldError id={`${title.replaceAll(' ', '-').toLowerCase()}-error`} message={error} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-heading font-semibold">{title}</h3>
        <Button
          type="button"
          variant="outline"
          disabled={value.length >= maxItems}
          onClick={() => onChange([...value, empty()])}
        >
          <Plus aria-hidden="true" /> {addLabel}
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg bg-slate-50 p-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                aria-label={`Remove ${title.toLowerCase()} item ${index + 1}`}
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-3 grid gap-3">
              {fields.map((field) => (
                <label key={String(field.key)}>
                  <span className="text-heading mb-1 block text-sm font-semibold">
                    {field.label}
                  </span>
                  <textarea
                    value={item[field.key]}
                    maxLength={field.maxLength}
                    rows={field.maxLength > 500 ? 4 : 2}
                    onChange={(event) =>
                      onChange(
                        value.map((current, itemIndex) =>
                          itemIndex === index
                            ? { ...current, [field.key]: event.target.value }
                            : current,
                        ),
                      )
                    }
                    className="w-full rounded-lg border bg-white p-3"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
