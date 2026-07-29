export const CACHE = Symbol('CACHE');

export interface ApplicationCache {
  ping(): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}
