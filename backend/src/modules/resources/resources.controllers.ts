import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminPrincipal } from '../auth/interfaces/auth.types';
import { CreateResourceDto, ResourceQueryDto } from './resources.dto';
import { ResourcesService } from './resources.service';

@ApiTags('Public Resources')
@Controller('public/resources')
export class PublicResourcesController {
  constructor(private readonly resources: ResourcesService) {}
  @Get() list(@Query() query: ResourceQueryDto) {
    return this.resources.listPublic(query);
  }
  @Get(':id/download')
  @ApiOperation({ summary: 'Count and return a published resource download' })
  @ApiHeader({
    name: 'cf-ipcountry',
    required: false,
    description: 'Optional two-letter country code supplied by the trusted edge proxy',
    schema: { type: 'string', pattern: '^[A-Z]{2}$', example: 'ET' },
  })
  download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('cf-ipcountry') country?: string,
  ) {
    return this.resources.download(id, country);
  }
}

@ApiTags('Admin Resources')
@ApiBearerAuth('admin-jwt')
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminResourcesController {
  constructor(private readonly resources: ResourcesService) {}
  @Get() list(@Query() query: ResourceQueryDto) {
    return this.resources.listAdmin(query);
  }
  @Post() create(@Body() dto: CreateResourceDto, @CurrentAdmin() actor: AdminPrincipal) {
    return this.resources.create(dto, actor);
  }
  @Post(':id/publish') publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.resources.publish(id, actor);
  }
  @Delete(':id') @Roles('SUPER_ADMIN') delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ) {
    return this.resources.delete(id, actor);
  }
}
