import { NOOP_CACHE } from './cache.interface';

describe('NOOP_CACHE', () => {
  it('keeps PostgreSQL loaders authoritative when Redis is unavailable', async () => {
    const loader = jest.fn().mockResolvedValue({ title: 'Database value' });

    await expect(NOOP_CACHE.remember('cms', 'en:about', 60, loader)).resolves.toEqual({
      title: 'Database value',
    });
    expect(loader).toHaveBeenCalledTimes(1);
    await expect(NOOP_CACHE.invalidate('cms')).resolves.toBeUndefined();
  });
});
