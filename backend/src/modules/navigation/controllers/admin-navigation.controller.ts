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
import { NavigationItem } from '../../../database/schema';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CreateNavigationItemDto } from '../dto/create-navigation-item.dto';
import { NavigationQueryDto } from '../dto/navigation-query.dto';
import { UpdateNavigationItemDto } from '../dto/update-navigation-item.dto';
import { NavigationService } from '../services/navigation.service';

@Controller('admin/navigation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_EDITOR')
export class AdminNavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  list(@Query() query: NavigationQueryDto): Promise<PaginatedResult<NavigationItem>> {
    return this.navigationService.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateNavigationItemDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<NavigationItem> {
    return this.navigationService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNavigationItemDto,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<NavigationItem> {
    return this.navigationService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<{ message: string }> {
    return this.navigationService.delete(id, actor);
  }
}
