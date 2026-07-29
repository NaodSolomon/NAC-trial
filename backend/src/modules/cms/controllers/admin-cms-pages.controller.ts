import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { CmsPage } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPageQueryDto } from '../dto/cms-page-query.dto';
import { CreateCmsPageDto } from '../dto/create-cms-page.dto';
import { ScheduleCmsPageDto } from '../dto/schedule-cms-page.dto';
import { UpdateCmsPageDto } from '../dto/update-cms-page.dto';
import { CmsPagesService } from '../services/cms-pages.service';

@Controller('admin/cms/pages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminCmsPagesController {
  constructor(private readonly pagesService: CmsPagesService) {}

  @Get()
  list(@Query() query: CmsPageQueryDto): Promise<PaginatedResult<CmsPage>> {
    return this.pagesService.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<CmsPage> {
    return this.pagesService.findAdminPage(id);
  }

  @Post()
  create(@Body() dto: CreateCmsPageDto, @CurrentAdmin() actor: AdminPrincipal): Promise<CmsPage> {
    return this.pagesService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCmsPageDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<CmsPage> {
    return this.pagesService.update(id, dto, actor);
  }

  @Post(':id/publish')
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<CmsPage> {
    return this.pagesService.publish(id, actor);
  }

  @Post(':id/schedule')
  schedule(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ScheduleCmsPageDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<CmsPage> {
    return this.pagesService.schedule(id, dto.scheduledAt, actor);
  }

  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<{ message: string }> {
    return this.pagesService.delete(id, actor);
  }
}
