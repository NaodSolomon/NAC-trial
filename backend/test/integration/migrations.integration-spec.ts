import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Drizzle migration chain', () => {
  it('has one ordered SQL file for every journal entry', () => {
    const directory = resolve(__dirname, '../../src/database/migrations');
    const journal = JSON.parse(readFileSync(resolve(directory, 'meta/_journal.json'), 'utf8')) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, index) => index),
    );
    for (const entry of journal.entries) {
      expect(existsSync(resolve(directory, `${entry.tag}.sql`))).toBe(true);
    }
  });
});
