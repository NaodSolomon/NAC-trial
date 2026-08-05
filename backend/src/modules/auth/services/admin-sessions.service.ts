import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/types/api-response.type';
import {
  ADMIN_REPOSITORY,
  AdminRepository,
} from '../../admins/interfaces/admin-repository.interface';
import { AdminSessionQueryDto } from '../dto/admin-session-query.dto';
import { RevokeSessionDto } from '../dto/revoke-session.dto';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSessionRepository,
} from '../interfaces/auth-session-repository.interface';
import { AdminSessionRecord } from '../interfaces/admin-session.types';
import { AdminPrincipal } from '../interfaces/auth.types';

@Injectable()
export class AdminSessionsService {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepository,
    @Inject(ADMIN_REPOSITORY)
    private readonly admins: AdminRepository,
  ) {}

  list(query: AdminSessionQueryDto): Promise<PaginatedResult<AdminSessionRecord>> {
    return this.sessions.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      adminId: query.adminId,
      status: query.status,
    });
  }

  async revoke(
    dto: RevokeSessionDto,
    actor: AdminPrincipal,
  ): Promise<{ message: string; revokedCount: number }> {
    if (Boolean(dto.sessionId) === Boolean(dto.adminId)) {
      throw new BadRequestException('Provide exactly one of sessionId or adminId');
    }

    if (dto.sessionId) {
      const result = await this.sessions.revokeSession(dto.sessionId, actor.id);

      if (result === 'not_found') {
        throw new NotFoundException('Session not found');
      }
      if (result === 'already_revoked') {
        throw new ConflictException('Session is already revoked');
      }

      return { message: 'Session revoked successfully', revokedCount: 1 };
    }

    const targetAdmin = await this.admins.findById(dto.adminId!);

    if (!targetAdmin) {
      throw new NotFoundException('Administrator not found');
    }

    const revokedCount = await this.sessions.revokeAllForAdmin(targetAdmin.id, actor.id);

    return {
      message: revokedCount
        ? 'Administrator sessions revoked successfully'
        : 'Administrator has no revocable sessions',
      revokedCount,
    };
  }
}
