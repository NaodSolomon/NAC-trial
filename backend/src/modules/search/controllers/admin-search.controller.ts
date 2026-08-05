import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import {
  SEARCH_TRIGRAM_INDEXES,
  SearchTrigramIndex,
} from '../interfaces/search-maintenance-repository.interface';
import {
  SearchAdministrationService,
  SearchReindexResponse,
} from '../services/search-administration.service';

class SearchReindexDataDto implements SearchReindexResponse {
  @ApiProperty({ example: true })
  reindexed!: true;

  @ApiProperty({ enum: SEARCH_TRIGRAM_INDEXES, isArray: true })
  indexes!: SearchTrigramIndex[];

  @ApiProperty({ format: 'date-time' })
  completedAt!: string;
}

class SearchReindexApiResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SearchReindexDataDto })
  data!: SearchReindexDataDto;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

@ApiTags('Search administration')
@ApiBearerAuth('admin-jwt')
@Controller('admin/system/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminSearchController {
  constructor(private readonly searchAdministration: SearchAdministrationService) {}

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rebuild the seven allowlisted PostgreSQL search indexes' })
  @ApiOkResponse({ type: SearchReindexApiResponseDto })
  @ApiConflictResponse({ description: 'Another rebuild currently holds the advisory lock' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({ description: 'Super-administrator role is required' })
  reindex(@CurrentAdmin() actor: AdminPrincipal): Promise<SearchReindexResponse> {
    return this.searchAdministration.reindex(actor);
  }
}
