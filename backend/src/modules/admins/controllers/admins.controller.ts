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
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminView } from '../interfaces/admin-view.interface';
import { AdminsService } from '../services/admins.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  list(@Query() query: AdminQueryDto): Promise<PaginatedResult<AdminView>> {
    return this.adminsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminView> {
    return this.adminsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdminDto, @CurrentAdmin() actor: AdminPrincipal): Promise<AdminView> {
    return this.adminsService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<AdminView> {
    return this.adminsService.update(id, dto, actor);
  }

  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<{ message: string }> {
    return this.adminsService.delete(id, actor);
  }
}
