'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  createNavigationItem,
  deleteNavigationItem,
  listNavigation,
  reorderNavigationItems,
  updateNavigationItem,
} from './admin-navigation.client';
import {
  navigationEditorSchema,
  type NavigationEditorValues,
  type NavigationItem,
  type NavigationLanguage,
} from './admin-navigation.schemas';

const emptyEditor: NavigationEditorValues = { label: '', url: '' };

export function NavigationAdmin() {
  const [language, setLanguage] = useState<NavigationLanguage>('en');
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, NavigationEditorValues>>({});
  const [newItem, setNewItem] = useState(emptyEditor);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void listNavigation(language, controller.signal)
      .then((result) => {
        setItems(result.data);
        setDrafts(Object.fromEntries(result.data.map((item) => [item.id, pickEditor(item)])));
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
  }, [language]);

  async function refreshPublicNavigation() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.navigation.all });
    await queryClient.refetchQueries({ queryKey: queryKeys.navigation.all, type: 'active' });
  }

  async function createItem() {
    const parsed = navigationEditorSchema.safeParse(newItem);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the new item.');
    setBusy('create');
    setError('');
    try {
      const order = items.length
        ? Math.min(10_000, Math.max(...items.map((item) => item.order)) + 10)
        : 0;
      const created = await createNavigationItem(language, parsed.data, order);
      setItems((current) => [...current, created]);
      setDrafts((current) => ({ ...current, [created.id]: pickEditor(created) }));
      setNewItem(emptyEditor);
      await refreshPublicNavigation();
      notify({
        title: 'Navigation item created',
        message: `${created.label} was added to ${language.toUpperCase()}.`,
      });
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setBusy('');
    }
  }

  async function saveItem(item: NavigationItem) {
    const parsed = navigationEditorSchema.safeParse(drafts[item.id]);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check this item.');
    setBusy(item.id);
    setError('');
    try {
      const updated = await updateNavigationItem(item.id, parsed.data);
      replaceItem(updated);
      await refreshPublicNavigation();
      notify({ title: 'Navigation item saved', message: updated.label });
    } catch (saveError) {
      setError(`${getApiErrorMessage(saveError)} Your unsaved fields remain unchanged.`);
    } finally {
      setBusy('');
    }
  }

  async function toggleVisibility(item: NavigationItem) {
    setBusy(item.id);
    setError('');
    try {
      replaceItem(await updateNavigationItem(item.id, { isVisible: !item.isVisible }));
      await refreshPublicNavigation();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError));
    } finally {
      setBusy('');
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (!items[otherIndex]) return;
    setBusy('reorder');
    setError('');
    try {
      await reorderNavigationItems(items[index], items[otherIndex]);
      setItems((current) => {
        const next = [...current];
        [next[index], next[otherIndex]] = [next[otherIndex], next[index]];
        return next;
      });
      await refreshPublicNavigation();
    } catch (reorderError) {
      setError(`${getApiErrorMessage(reorderError)} The authoritative order will be reloaded.`);
      const result = await listNavigation(language);
      setItems(result.data);
    } finally {
      setBusy('');
    }
  }

  async function remove(item: NavigationItem) {
    if (!window.confirm(`Delete “${item.label}”? This cannot be undone.`)) return;
    setBusy(item.id);
    try {
      await deleteNavigationItem(item.id);
      setItems((current) => current.filter(({ id }) => id !== item.id));
      await refreshPublicNavigation();
      notify({ title: 'Navigation item deleted', message: item.label });
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setBusy('');
    }
  }

  function replaceItem(updated: NavigationItem) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  if (forbidden) return <AdminAccessDenied />;
  return (
    <section aria-labelledby="navigation-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Public shell</p>
      <h1
        id="navigation-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Navigation
      </h1>
      <p className="text-foreground mt-2 max-w-2xl">
        Edit and order each language independently. Hidden items disappear from the public header
        and footer.
      </p>

      <div
        className="mt-6 inline-flex rounded-lg border bg-white p-1"
        role="tablist"
        aria-label="Navigation language"
      >
        {(['en', 'am'] as const).map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={language === code}
            onClick={() => setLanguage(code)}
            className={`min-h-11 rounded-md px-5 text-sm font-semibold ${language === code ? 'bg-primary text-white' : ''}`}
          >
            {code === 'en' ? 'English' : 'Amharic'}
          </button>
        ))}
      </div>

      <form
        className="bg-card mt-6 grid gap-4 rounded-xl border p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void createItem();
        }}
      >
        <Field
          label="New label"
          value={newItem.label}
          onChange={(label) => setNewItem({ ...newItem, label })}
        />
        <Field
          label="New destination"
          value={newItem.url}
          placeholder="/about"
          onChange={(url) => setNewItem({ ...newItem, url })}
        />
        <Button className="self-end" type="submit" disabled={busy === 'create'}>
          <Plus aria-hidden="true" /> Add item
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div
          role="status"
          aria-label="Loading navigation"
          className="bg-card mt-6 h-56 animate-pulse rounded-xl border motion-reduce:animate-none"
        />
      ) : items.length === 0 ? (
        <p role="status" className="bg-card mt-6 rounded-xl border p-8">
          No {language.toUpperCase()} navigation items exist yet.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {items.map((item, index) => {
            const draft = drafts[item.id] ?? pickEditor(item);
            return (
              <li
                key={item.id}
                className="bg-card grid gap-4 rounded-xl border p-5 shadow-sm lg:grid-cols-[auto_1fr_1fr_auto]"
              >
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${item.label} up`}
                    disabled={index === 0 || busy === 'reorder'}
                    onClick={() => void move(index, -1)}
                    className="min-h-11 min-w-11 rounded-md border p-2 disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${item.label} down`}
                    disabled={index === items.length - 1 || busy === 'reorder'}
                    onClick={() => void move(index, 1)}
                    className="min-h-11 min-w-11 rounded-md border p-2 disabled:opacity-40"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <Field
                  label="Label"
                  value={draft.label}
                  onChange={(label) => setDrafts({ ...drafts, [item.id]: { ...draft, label } })}
                />
                <Field
                  label="Destination"
                  value={draft.url}
                  onChange={(url) => setDrafts({ ...drafts, [item.id]: { ...draft, url } })}
                />
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy === item.id}
                    onClick={() => void toggleVisibility(item)}
                  >
                    {item.isVisible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {item.isVisible ? 'Visible' : 'Hidden'}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => void saveItem(item)}
                  >
                    <Save aria-hidden="true" /> Save
                  </Button>
                  {role === 'SUPER_ADMIN' && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy === item.id}
                      onClick={() => void remove(item)}
                    >
                      <Trash2 aria-hidden="true" /> Delete
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-heading mb-2 block text-sm font-semibold">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-3"
      />
    </label>
  );
}

function pickEditor(item: NavigationItem): NavigationEditorValues {
  return { label: item.label, url: item.url };
}
