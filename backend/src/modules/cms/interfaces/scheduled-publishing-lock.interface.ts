export const SCHEDULED_PUBLISHING_LOCK = Symbol('SCHEDULED_PUBLISHING_LOCK');

export type ScheduledPublishingLockResult<T> = { acquired: true; value: T } | { acquired: false };

export interface ScheduledPublishingLock {
  runExclusive<T>(operation: () => Promise<T>): Promise<ScheduledPublishingLockResult<T>>;
}
