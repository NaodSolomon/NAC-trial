import { AuditLogRepository } from '../audit/interfaces/audit-log-repository.interface';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { ApplicationCache } from '../cache/cache.interface';
import { CacheAdministrationService } from './cache-administration.service';
import { CacheWarmService } from './cache-warm.service';

describe('CacheAdministrationService', () => {
  const actor: AdminPrincipal = {
    id: 'c11a7137-9ed8-43f5-b46d-bbd31282619f',
    email: 'admin@example.com',
    name: 'Administrator',
    role: 'SUPER_ADMIN',
  };
  let cache: jest.Mocked<ApplicationCache>;
  let warmer: jest.Mocked<CacheWarmService>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let service: CacheAdministrationService;

  beforeEach(() => {
    cache = {
      ping: jest.fn(),
      remember: jest.fn(),
      invalidate: jest.fn(),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    warmer = {
      warm: jest
        .fn()
        .mockResolvedValue({ warmed: ['settings:public', 'navigation:en', 'navigation:am'] }),
    } as unknown as jest.Mocked<CacheWarmService>;
    auditLogs = {
      append: jest.fn().mockResolvedValue({} as never),
      list: jest.fn(),
    };
    service = new CacheAdministrationService(cache, warmer, auditLogs);
  });

  it('records the acting administrator after clearing the cache', async () => {
    await expect(service.clear(actor)).resolves.toEqual({ cleared: true });

    expect(cache.clear).toHaveBeenCalledTimes(1);
    expect(auditLogs.append).toHaveBeenCalledWith({
      adminId: actor.id,
      action: 'CLEAR',
      entityType: 'CACHE',
      metadata: { scope: 'all-public-cache-namespaces' },
    });
  });

  it('records the warmed keys after cache warming succeeds', async () => {
    await expect(service.warm(actor)).resolves.toEqual({
      warmed: ['settings:public', 'navigation:en', 'navigation:am'],
    });

    expect(auditLogs.append).toHaveBeenCalledWith({
      adminId: actor.id,
      action: 'WARM',
      entityType: 'CACHE',
      metadata: { keys: ['settings:public', 'navigation:en', 'navigation:am'] },
    });
  });

  it('does not claim a failed cache operation in the immutable audit log', async () => {
    cache.clear.mockRejectedValueOnce(new Error('Redis unavailable'));

    await expect(service.clear(actor)).rejects.toThrow('Redis unavailable');
    expect(auditLogs.append).not.toHaveBeenCalled();
  });
});
