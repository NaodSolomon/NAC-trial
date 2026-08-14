import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPagesService } from '../../cms/services/cms-pages.service';
import { CreateTestimonialDto } from '../dto/create-testimonial.dto';
import { CreateVolunteerApplicationDto } from '../dto/create-volunteer-application.dto';
import { NewsletterQueryDto, NewsletterSignupDto } from '../dto/newsletter.dto';
import { AdminTestimonialQueryDto, PublicTestimonialQueryDto } from '../dto/testimonial-query.dto';
import { UpdateTestimonialDto } from '../dto/update-testimonial.dto';
import { VolunteerApplicationQueryDto } from '../dto/volunteer-application-query.dto';
import {
  ENGAGEMENT_REPOSITORY,
  EngagementRepository,
} from '../interfaces/engagement-repository.interface';

@Injectable()
export class EngagementService {
  constructor(
    @Inject(ENGAGEMENT_REPOSITORY)
    private readonly engagement: EngagementRepository,
    private readonly pages: CmsPagesService,
  ) {}

  async getVolunteerPage(languageCode: 'en' | 'am') {
    const page = await this.pages.findPublicPage('volunteer', languageCode);
    return {
      title: page.title,
      description: page.content,
      languageCode: page.languageCode,
      roles: page.metadata.volunteerRoles ?? [],
    };
  }

  async apply(dto: CreateVolunteerApplicationDto): Promise<{ status: 'submitted' }> {
    await this.engagement.createApplication({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      roleInterest: dto.roleInterest.trim(),
      message: dto.message.trim(),
      languageCode: dto.languageCode,
    });
    return { status: 'submitted' };
  }

  listApplications(query: VolunteerApplicationQueryDto) {
    return this.engagement.listApplications({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      status: query.status,
      languageCode: query.languageCode,
      search: query.search?.trim(),
    });
  }

  async deleteApplication(id: string, actor: AdminPrincipal) {
    if (!(await this.engagement.deleteApplication(id, actor.id))) {
      throw new NotFoundException(`Volunteer application ${id} was not found`);
    }
    return { message: 'Volunteer application deleted successfully' };
  }

  listPublicTestimonials(query: PublicTestimonialQueryDto) {
    return this.engagement.listTestimonials(
      {
        page: query.page,
        limit: query.limit,
        offset: query.offset,
        sortOrder: query.sortOrder,
        languageCode: query.languageCode,
      },
      true,
    );
  }

  listAdminTestimonials(query: AdminTestimonialQueryDto) {
    return this.engagement.listTestimonials(
      {
        page: query.page,
        limit: query.limit,
        offset: query.offset,
        sortOrder: query.sortOrder,
        languageCode: query.languageCode,
        status: query.status,
      },
      false,
    );
  }

  async createTestimonial(dto: CreateTestimonialDto, actor: AdminPrincipal) {
    try {
      return await this.engagement.createTestimonial(
        {
          name: dto.name.trim(),
          text: dto.text.trim(),
          languageCode: dto.languageCode,
          status: dto.status,
          translationKey: dto.translationKey,
          createdBy: actor.id,
        },
        actor.id,
      );
    } catch (error: unknown) {
      this.rethrowTestimonialConflict(error);
    }
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto, actor: AdminPrincipal) {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('At least one field must be provided');
    }
    const updated = await this.engagement.updateTestimonial(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.text !== undefined && { text: dto.text.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      actor.id,
    );
    if (!updated) {
      throw new NotFoundException(`Testimonial ${id} was not found`);
    }
    return updated;
  }

  async deleteTestimonial(id: string, actor: AdminPrincipal) {
    if (!(await this.engagement.deleteTestimonial(id, actor.id))) {
      throw new NotFoundException(`Testimonial ${id} was not found`);
    }
    return { message: 'Testimonial deleted successfully' };
  }

  async subscribe(dto: NewsletterSignupDto): Promise<{ status: 'subscribed' }> {
    try {
      await this.engagement.createSubscriber({
        email: dto.email.trim().toLowerCase(),
        languageCode: dto.languageCode,
      });
    } catch (error: unknown) {
      if (!this.isUniqueViolation(error)) throw error;
    }
    return { status: 'subscribed' };
  }

  listSubscribers(query: NewsletterQueryDto) {
    return this.engagement.listSubscribers({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
    });
  }

  async deleteSubscriber(email: string, actor: AdminPrincipal) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!(await this.engagement.deleteSubscriber(normalizedEmail, actor.id))) {
      throw new NotFoundException('Newsletter subscriber was not found');
    }
    return { message: 'Newsletter subscriber deleted successfully' };
  }

  private rethrowTestimonialConflict(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException(
        'This testimonial translation already exists for the selected language',
      );
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    if ('code' in error && error.code === '23505') return true;
    return (
      'cause' in error &&
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'code' in error.cause &&
      error.cause.code === '23505'
    );
  }
}
