import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { UpdateSeoDto } from '../dto/update-seo.dto';
import { SeoApiResponseDto, SeoResponse } from '../interfaces/seo-response.interface';
import { SeoService } from '../services/seo.service';

@ApiTags('SEO')
@ApiBearerAuth('admin-jwt')
@Controller('admin/seo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminSeoController {
  constructor(private readonly seo: SeoService) {}

  @Patch(':slug')
  @ApiOperation({ summary: 'Update SEO metadata stored on a CMS page' })
  @ApiOkResponse({ type: SeoApiResponseDto })
  @ApiBadRequestResponse({ description: 'SEO metadata failed validation' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({ description: 'Editor or super-administrator role is required' })
  @ApiNotFoundResponse({ description: 'CMS page was not found' })
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateSeoDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<SeoResponse> {
    return this.seo.update(slug, dto, actor);
  }
}
