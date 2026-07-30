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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { BlogLanguageDto, BlogQueryDto, CreateBlogPostDto, UpdateBlogPostDto } from './blog.dto';
import { BlogService } from './blog.service';

@ApiTags('Public Blog')
@Controller('public/blog')
export class PublicBlogController {
  constructor(private readonly blog: BlogService) {}
  @Get()
  @ApiOperation({ summary: 'List published blog posts' })
  list(@Query() query: BlogQueryDto) {
    return this.blog.listPublic(query);
  }
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published blog post and SEO metadata' })
  detail(@Param('slug') slug: string, @Query() query: BlogLanguageDto) {
    return this.blog.findPublic(slug, query);
  }
}

@ApiTags('Admin Blog')
@ApiBearerAuth('admin-jwt')
@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminBlogController {
  constructor(private readonly blog: BlogService) {}
  @Get() list(@Query() query: BlogQueryDto) {
    return this.blog.listAdmin(query);
  }
  @Post() create(@Body() dto: CreateBlogPostDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.blog.create(dto, actor);
  }
  @Patch(':id') update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.blog.update(id, dto, actor);
  }
  @Post(':id/publish') publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.blog.publish(id, actor);
  }
  @Delete(':id') @Roles('SUPER_ADMIN') delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.blog.delete(id, actor);
  }
}
