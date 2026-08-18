import { describe, expect, it } from 'vitest';
import { messages, translate, type MessageKey } from './messages';

const keys = Object.keys(messages.en) as MessageKey[];

describe('translate', () => {
  it('returns the requested language', () => {
    expect(translate('am', 'home')).toBe(messages.am.home);
    expect(translate('en', 'home')).toBe(messages.en.home);
  });

  it('never returns an empty string for a known key', () => {
    for (const key of keys) {
      expect(translate('en', key).trim()).not.toBe('');
      expect(translate('am', key).trim()).not.toBe('');
    }
  });

  it('keeps the Amharic dictionary complete, so nothing silently falls back', () => {
    // A missing Amharic key would render English to an Amharic reader without any
    // signal that it happened, so the dictionaries are required to stay aligned.
    expect(Object.keys(messages.am).sort()).toEqual(keys.sort());
  });
});
