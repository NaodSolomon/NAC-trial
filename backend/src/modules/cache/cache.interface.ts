export const CACHE = Symbol('CACHE');

export const PUBLIC_CACHE_NAMESPACES = [
  'settings',
  'navigation',
  'cms',
  'events',
  'gallery',
  'analytics',
] as const;

export type PublicCacheNamespace = (typeof PUBLIC_CACHE_NAMESPACES)[number];

export interface ApplicationCache {
  ping(): Promise<boolean>;
  remember<T>(
    namespace: PublicCacheNamespace,
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T>;
  invalidate(namespace: PublicCacheNamespace): Promise<void>;
  clear(): Promise<void>;
}

export const NOOP_CACHE: ApplicationCache = {
  ping: async () => false,
  remember: async (_namespace, _key, _ttl, loader) => loader(),
  invalidate: async () => undefined,
  clear: async () => undefined,
};
