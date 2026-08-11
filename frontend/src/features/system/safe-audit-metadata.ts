const SAFE_KEYS = new Set([
  'scope',
  'keys',
  'indexes',
  'durationMs',
  'languageCode',
  'role',
  'status',
  'startedAt',
  'completedAt',
  'scheduledAt',
  'revokedCount',
  'subscribedAt',
]);

export interface SafeAuditField {
  label: string;
  value: string;
}

export function safeAuditMetadata(metadata: Record<string, unknown>): SafeAuditField[] {
  return Object.entries(metadata).flatMap(([key, value]) => {
    if (!SAFE_KEYS.has(key)) return [];
    const safeValue = normalizeValue(value);
    return safeValue === null ? [] : [{ label: humanize(key), value: safeValue }];
  });
}

function normalizeValue(value: unknown): string | null {
  if (typeof value === 'string') return value.slice(0, 160);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value
      .slice(0, 10)
      .map((entry) => entry.slice(0, 80))
      .join(', ');
  }
  return null;
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase());
}
