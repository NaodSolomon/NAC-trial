import { describe, expect, it } from 'vitest';
import { emptyFaqEditor, faqEditorSchema } from './faq-admin.schemas';

function messagesFor(value: unknown, path: string) {
  const result = faqEditorSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path.join('.') === path)
    .map((issue) => issue.message);
}

const valid = {
  translationKey: 'what-does-the-center-do',
  languageCode: 'en',
  category: 'Services',
  question: 'What does the centre do?',
  answer: 'It supports autistic children and their families.',
};

describe('faqEditorSchema', () => {
  it('accepts a complete entry', () => {
    expect(faqEditorSchema.safeParse(valid).success).toBe(true);
  });

  it('treats the category as optional but bounded', () => {
    expect(faqEditorSchema.safeParse({ ...valid, category: '' }).success).toBe(true);
    expect(messagesFor({ ...valid, category: 'x'.repeat(121) }, 'category')).toEqual([
      'Keep the category under 120 characters.',
    ]);
  });

  it('requires a question and an answer', () => {
    expect(messagesFor({ ...valid, question: '' }, 'question')).toEqual([
      'A question is required.',
    ]);
    expect(messagesFor({ ...valid, answer: '' }, 'answer')).toEqual(['An answer is required.']);
  });

  it('measures length after trimming, so whitespace cannot stand in for content', () => {
    expect(messagesFor({ ...valid, answer: '     ' }, 'answer')).toEqual([
      'An answer is required.',
    ]);
  });

  it.each([
    ['Uppercase-Key', 'uppercase letters are not allowed'],
    ['double--hyphen', 'a repeated hyphen is not allowed'],
    ['-leading', 'a leading hyphen is not allowed'],
    ['trailing-', 'a trailing hyphen is not allowed'],
    ['under_score', 'an underscore is not allowed'],
  ])('rejects the translation key %o because %s', (translationKey) => {
    expect(messagesFor({ ...valid, translationKey }, 'translationKey')).toEqual([
      'Use lowercase letters, numbers and single hyphens.',
    ]);
  });

  it('pairs translations across languages through the same key', () => {
    // The key is what links an English entry to its Amharic counterpart, so both
    // languages must accept the identical value.
    for (const languageCode of ['en', 'am']) {
      expect(faqEditorSchema.safeParse({ ...valid, languageCode }).success).toBe(true);
    }
    expect(faqEditorSchema.safeParse({ ...valid, languageCode: 'fr' }).success).toBe(false);
  });

  it('starts a blank editor with nothing pre-filled but a default language', () => {
    expect(emptyFaqEditor).toEqual({
      translationKey: '',
      languageCode: 'en',
      question: '',
      answer: '',
      category: '',
    });
    // A blank key would fail the slug rule, so a new entry cannot be saved by accident.
    expect(faqEditorSchema.safeParse(emptyFaqEditor).success).toBe(false);
  });
});
