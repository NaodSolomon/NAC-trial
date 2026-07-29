import { BadRequestException } from '@nestjs/common';
import { AuditLogRepository } from '../interfaces/audit-log-repository.interface';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  let repository: jest.Mocked<AuditLogRepository>;
  let service: AuditLogsService;

  beforeEach(() => {
    repository = {
      list: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
    };
    service = new AuditLogsService(repository);
  });

  it('converts validated date filters before querying', async () => {
    await service.list({
      page: 1,
      limit: 20,
      offset: 0,
      sortOrder: 'desc',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      }),
    );
  });

  it('rejects an inverted date range', () => {
    expect(() =>
      service.list({
        page: 1,
        limit: 20,
        offset: 0,
        sortOrder: 'desc',
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });
});
