import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyFaqEditor,
  faqEditorFromEntry,
  faqEditorSchema,
  firstFaqEditorError,
  type AdminFaq,
} from './faq-admin.schemas';
import { faqCollectionSchema } from './faq.schemas';

const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiGet = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/lib/api/browser-client', () => ({
  browserApiClient: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}));

const entry: AdminFaq = {
  id: '00000000-0000-4000-8000-000000000901',
  languageCode: 'en',
  translationKey: 'what-does-the-center-do',
  category: 'Services',
  question: 'What does the center do?',
  answer: 'We support autistic children and their families.',
  status: 'PUBLISHED',
  sortOrder: 2,
};

describe('FAQ administration contracts', () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiPatch.mockReset();
    apiGet.mockReset();
    apiDelete.mockReset();
  });

  it('maps a stored entry into editor fields', () => {
    expect(faqEditorFromEntry(entry)).toEqual({
      translationKey: 'what-does-the-center-do',
      languageCode: 'en',
      question: 'What does the center do?',
      answer: 'We support autistic children and their families.',
      category: 'Services',
    });
  });

  it('represents an absent category as an empty field', () => {
    expect(faqEditorFromEntry({ ...entry, category: null }).category).toBe('');
  });

  it.each([
    ['an empty question', { question: '' }],
    ['an empty answer', { answer: '' }],
    ['a one-character translation key', { translationKey: 'a' }],
    ['an uppercase translation key', { translationKey: 'Whats-This' }],
    ['a translation key with spaces', { translationKey: 'what does it do' }],
    ['a double-hyphen translation key', { translationKey: 'what--does' }],
    ['an unsupported language', { languageCode: 'fr' }],
  ])('rejects %s', (_label, overrides) => {
    const values = { ...faqEditorFromEntry(entry), ...overrides };
    expect(faqEditorSchema.safeParse(values).success).toBe(false);
  });

  it('accepts a valid entry without a category', () => {
    const values = { ...faqEditorFromEntry(entry), category: '' };
    expect(faqEditorSchema.safeParse(values).success).toBe(true);
  });

  it('reports the first validation problem in plain language', () => {
    expect(firstFaqEditorError({ ...emptyFaqEditor })).toMatch(/translation key/i);
    expect(firstFaqEditorError({ ...faqEditorFromEntry(entry), answer: '' })).toMatch(/answer/i);
    expect(firstFaqEditorError(faqEditorFromEntry(entry))).toBe('');
  });

  it('sends the translation key and language only when creating', async () => {
    const { createFaq, updateFaq } = await import('./faq-admin.client');
    apiPost.mockResolvedValue(entry);
    apiPatch.mockResolvedValue(entry);

    await createFaq(faqEditorFromEntry(entry));
    expect(apiPost.mock.calls[0][1]).toMatchObject({
      translationKey: 'what-does-the-center-do',
      languageCode: 'en',
    });

    await updateFaq(entry.id, faqEditorFromEntry(entry));
    expect(apiPatch.mock.calls[0][1]).not.toHaveProperty('translationKey');
    expect(apiPatch.mock.calls[0][1]).not.toHaveProperty('languageCode');
  });

  it('omits a blank category from the payload rather than sending an empty string', async () => {
    const { createFaq } = await import('./faq-admin.client');
    apiPost.mockResolvedValue(entry);

    await createFaq({ ...faqEditorFromEntry(entry), category: '' });

    expect(apiPost.mock.calls[0][1]).not.toHaveProperty('category');
  });

  it('sends a contiguous order when reordering', async () => {
    const { reorderFaqs } = await import('./faq-admin.client');
    apiPost.mockResolvedValue(undefined);

    await reorderFaqs([
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 1 },
    ]);

    expect(apiPost).toHaveBeenCalledWith('/admin/faqs/reorder', {
      entries: [
        { id: 'a', sortOrder: 0 },
        { id: 'b', sortOrder: 1 },
      ],
    });
  });

  it('accepts the public collection shape the page renders', () => {
    const parsed = faqCollectionSchema.safeParse({
      languageCode: 'en',
      items: [{ id: entry.id, question: entry.question, answer: entry.answer, category: null }],
    });
    expect(parsed.success).toBe(true);
  });
});
