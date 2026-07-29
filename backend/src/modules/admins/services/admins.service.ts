import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../../common/types/api-response.type';
import { Admin } from '../../../database/schema';
import { ADMIN_REPOSITORY, AdminRepository } from '../interfaces/admin-repository.interface';
import {
  ADMIN_MANAGEMENT_REPOSITORY,
  AdminManagementRepository,
} from '../interfaces/admin-management-repository.interface';
import { AdminView } from '../interfaces/admin-view.interface';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { AdminQueryDto } from '../dto/admin-query.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

@Injectable()
export class AdminsService {
  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly admins: AdminRepository,
    @Inject(ADMIN_MANAGEMENT_REPOSITORY)
    private readonly management: AdminManagementRepository,
  ) {}

  async list(query: AdminQueryDto): Promise<PaginatedResult<AdminView>> {
    const result = await this.management.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      role: query.role,
      isActive: query.isActive,
    });

    return {
      data: result.data.map((admin) => this.toView(admin)),
      meta: result.meta,
    };
  }

  async findOne(id: string): Promise<AdminView> {
    const admin = await this.admins.findById(id);

    if (!admin) {
      throw new NotFoundException(`Administrator ${id} was not found`);
    }

    return this.toView(admin);
  }

  async create(dto: CreateAdminDto, actor: AdminPrincipal): Promise<AdminView> {
    try {
      const created = await this.management.create(
        {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: dto.role,
        },
        actor.id,
      );

      return this.toView(created);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('An administrator with this email already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAdminDto, actor: AdminPrincipal): Promise<AdminView> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    const result = await this.management.update(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.password !== undefined && {
          passwordHash: await bcrypt.hash(dto.password, 12),
        }),
      },
      actor.id,
    );

    if (result.status === 'not_found') {
      throw new NotFoundException(`Administrator ${id} was not found`);
    }
    if (result.status === 'last_super_admin') {
      throw new ConflictException(
        'The final active super administrator cannot be demoted or deactivated',
      );
    }
    if (result.status !== 'updated') {
      throw new ConflictException('Administrator could not be updated');
    }

    return this.toView(result.admin);
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    if (id === actor.id) {
      throw new ConflictException('Administrators cannot delete their own account');
    }

    const result = await this.management.delete(id, actor.id);

    if (result.status === 'not_found') {
      throw new NotFoundException(`Administrator ${id} was not found`);
    }
    if (result.status === 'last_super_admin') {
      throw new ConflictException('The final active super administrator cannot be deleted');
    }
    if (result.status !== 'deleted') {
      throw new ConflictException('Administrator could not be deleted');
    }

    return { message: 'Administrator deleted successfully' };
  }

  private toView(admin: Admin): AdminView {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    if ('code' in error && error.code === '23505') {
      return true;
    }

    return (
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause &&
      error.cause.code === '23505'
    );
  }
}
