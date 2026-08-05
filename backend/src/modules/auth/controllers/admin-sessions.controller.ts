import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { AdminSessionQueryDto } from '../dto/admin-session-query.dto';
import {
  AdminSessionListApiResponseDto,
  RevokeSessionApiResponseDto,
} from '../dto/admin-session-response.dto';
import { RevokeSessionDto } from '../dto/revoke-session.dto';
import { AdminSessionRecord } from '../interfaces/admin-session.types';
import { AdminPrincipal } from '../interfaces/auth.types';
import { AdminSessionsService } from '../services/admin-sessions.service';

@ApiTags('Administrator sessions')
@ApiBearerAuth()
@Controller('admin/system/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminSessionsController {
  constructor(private readonly adminSessions: AdminSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List administrator sessions without exposing token material' })
  @ApiOkResponse({ type: AdminSessionListApiResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({ description: 'Super-administrator role is required' })
  list(@Query() query: AdminSessionQueryDto): Promise<PaginatedResult<AdminSessionRecord>> {
    return this.adminSessions.list(query);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke one session or all sessions for an administrator' })
  @ApiOkResponse({ type: RevokeSessionApiResponseDto })
  @ApiBadRequestResponse({ description: 'Exactly one revocation target is required' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({ description: 'Super-administrator role is required' })
  @ApiNotFoundResponse({ description: 'The session or administrator does not exist' })
  @ApiConflictResponse({ description: 'The selected session was already revoked' })
  revoke(
    @Body() dto: RevokeSessionDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<{ message: string; revokedCount: number }> {
    return this.adminSessions.revoke(dto, actor);
  }
}
