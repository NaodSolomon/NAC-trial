import { ConflictException } from '@nestjs/common';
import { AuditLogRepository } from '../../audit/interfaces/audit-log-repository.interface';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import {
  SEARCH_TRIGRAM_INDEXES,
  SearchMaintenanceRepository,
} from '../interfaces/search-maintenance-repository.interface';
import { SearchAdministrationService } from './search-administration.service';

const actor: AdminPrincipal = {
  id: '273464af-f8e0-4c9d-8b39-aeac196fb05b',
  name: 'Super Administrator',
  email: 'super@example.org',
  role: 'SUPER_ADMIN',
};
const startedAt = new Date('2026-08-05T12:00:00.000Z');
const completedAt = new Date('2026-08-05T12:00:01.250Z');

describe('SearchAdministrationService', () => {
  let maintenance: jest.Mocked<SearchMaintenanceRepository>;
  let audits: jest.Mocked<AuditLogRepository>;
  let service: SearchAdministrationService;

  beforeEach(() => {
    maintenance = { rebuild: jest.fn() };
    audits = { append: jest.fn(), list: jest.fn() };
    service = new SearchAdministrationService(maintenance, audits);
  });

  it('audits and returns a completed allowlisted rebuild', async () => {
    maintenance.rebuild.mockResolvedValue({
      status: 'completed',
      indexes: [...SEARCH_TRIGRAM_INDEXES],
      startedAt,
      completedAt,
      durationMs: 1_250,
    });

    await expect(service.reindex(actor)).resolves.toEqual({
      reindexed: true,
      indexes: [...SEARCH_TRIGRAM_INDEXES],
      completedAt: completedAt.toISOString(),
    });
    expect(audits.append).toHaveBeenCalledWith({
      adminId: actor.id,
      action: 'REINDEX',
      entityType: 'SEARCH',
      metadata: {
        indexes: [...SEARCH_TRIGRAM_INDEXES],
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: 1_250,
      },
    });
  });

  it('returns conflict and writes no audit when another rebuild owns the lock', async () => {
    maintenance.rebuild.mockResolvedValue({ status: 'busy' });

    await expect(service.reindex(actor)).rejects.toBeInstanceOf(ConflictException);
    expect(audits.append).not.toHaveBeenCalled();
  });

  it('does not write a success audit when PostgreSQL rebuilding fails', async () => {
    maintenance.rebuild.mockRejectedValue(new Error('PostgreSQL reindex failure'));

    await expect(service.reindex(actor)).rejects.toThrow('PostgreSQL reindex failure');
    expect(audits.append).not.toHaveBeenCalled();
  });
});
