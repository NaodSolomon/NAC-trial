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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import {
  CreateFaqDto,
  FaqQueryDto,
  PublicFaqQueryDto,
  ReorderFaqDto,
  UpdateFaqDto,
} from '../dto/faq.dto';
import { FaqService } from '../services/faq.service';

@ApiTags('Public FAQ')
@Controller('public/faqs')
export class PublicFaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'List published FAQ entries in display order' })
  @ApiResponse({ status: 200, description: 'Published FAQ entries for the requested language' })
  list(@Query() query: PublicFaqQueryDto) {
    return this.service.listPublic(query.languageCode, query.category);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories that have published FAQ entries' })
  categories(@Query() query: PublicFaqQueryDto) {
    return this.service.categories(query.languageCode);
  }
}

@ApiTags('Admin FAQ')
@ApiBearerAuth('admin-jwt')
@Controller('admin/faqs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminFaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'List every FAQ entry regardless of status' })
  list(@Query() query: FaqQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft FAQ entry' })
  @ApiResponse({ status: 201, description: 'The created draft FAQ entry' })
  @ApiResponse({ status: 409, description: 'Translation already exists for this language' })
  create(@Body() dto: CreateFaqDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/publish')
  @ApiResponse({ status: 201, description: 'The published FAQ entry' })
  publish(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.publish(id, actor);
  }

  @Post(':id/unpublish')
  @ApiResponse({ status: 201, description: 'The FAQ entry returned to draft' })
  unpublish(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.unpublish(id, actor);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Apply a new display order to existing FAQ entries' })
  @ApiResponse({ status: 201, description: 'How many entries changed position' })
  reorder(@Body() dto: ReorderFaqDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.reorder(dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.delete(id, actor);
  }
}
