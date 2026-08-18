import { z } from 'zod';

const isoDate = z.coerce.date().transform((value) => value.toISOString());
const pageMeta = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export const administratorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']),
  isActive: z.boolean(),
  lastLoginAt: isoDate.nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export const administratorListSchema = z.object({
  data: z.array(administratorSchema),
  meta: pageMeta,
});

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const passwordLengthMessage = 'Password must contain at least 12 characters.';
const passwordCharacterMessage =
  'Password must include uppercase, lowercase and numeric characters.';
const administratorRoleSchema = z.enum(['SUPER_ADMIN', 'CONTENT_EDITOR', 'FINANCE_VIEWER']);
const administratorNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must contain at least 2 characters.')
  .max(150);

export const passwordPolicyHint =
  'At least 12 characters, including an uppercase letter, a lowercase letter and a number.';

export const administratorEditorSchema = z.object({
  name: administratorNameSchema,
  email: z.string().trim().email('Enter a valid email address.').max(255),
  password: z
    .string()
    .min(12, passwordLengthMessage)
    .max(128)
    .regex(passwordPattern, passwordCharacterMessage),
  role: administratorRoleSchema,
});
export const administratorUpdateSchema = z.object({
  name: administratorNameSchema,
  role: administratorRoleSchema,
  isActive: z.boolean(),
  // An empty value means "leave the current password alone", so the rules apply
  // only once something has actually been typed.
  password: z
    .string()
    .max(128)
    .refine((value) => value === '' || value.length >= 12, passwordLengthMessage)
    .refine((value) => value === '' || passwordPattern.test(value), passwordCharacterMessage),
});

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: isoDate,
});
export const auditLogListSchema = z.object({ data: z.array(auditLogSchema), meta: pageMeta });

export const adminSessionSchema = z.object({
  id: z.string().uuid(),
  admin: z.object({ id: z.string().uuid(), name: z.string(), email: z.string().email() }),
  userAgent: z.string().nullable(),
  ipFingerprint: z.string().max(24).nullable(),
  createdAt: isoDate,
  lastUsedAt: isoDate,
  expiresAt: isoDate,
  status: z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']),
});
export const adminSessionListSchema = z.object({
  data: z.array(adminSessionSchema),
  meta: pageMeta,
});
export const revokeSessionSchema = z.object({
  message: z.string(),
  revokedCount: z.number().int().nonnegative(),
});

export const cacheClearSchema = z.object({ cleared: z.literal(true) });
export const cacheWarmSchema = z.object({ warmed: z.array(z.string()) });
export const searchReindexSchema = z.object({
  reindexed: z.literal(true),
  indexes: z.array(z.string()),
  completedAt: isoDate,
});

export const livenessSchema = z.object({
  status: z.literal('ok'),
  process: z.literal('alive'),
  mode: z.enum(['trial', 'production']),
  timestamp: isoDate,
});
export const readinessSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unavailable']),
  checks: z.object({
    postgresql: z.enum(['connected', 'unavailable']),
    redis: z.enum(['connected', 'unavailable']),
  }),
  database: z.enum(['connected', 'unavailable']),
  redis: z.enum(['connected', 'unavailable']),
  mode: z.enum(['trial', 'production']),
  timestamp: isoDate,
});
export const versionSchema = z.object({
  name: z.string(),
  version: z.string(),
  environment: z.string(),
  mode: z.enum(['trial', 'production']),
  adapters: z.object({
    storage: z.string(),
    mail: z.string(),
    payment: z.string(),
    cache: z.string(),
  }),
  realPaymentsEnabled: z.boolean(),
});

export type Administrator = z.infer<typeof administratorSchema>;
export type AdministratorEditor = z.infer<typeof administratorEditorSchema>;
export type AdministratorUpdate = z.infer<typeof administratorUpdateSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type AdminSession = z.infer<typeof adminSessionSchema>;
export type Liveness = z.infer<typeof livenessSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
export type VersionInformation = z.infer<typeof versionSchema>;

export const emptyAdministratorEditor: AdministratorEditor = {
  name: '',
  email: '',
  password: '',
  role: 'CONTENT_EDITOR',
};
