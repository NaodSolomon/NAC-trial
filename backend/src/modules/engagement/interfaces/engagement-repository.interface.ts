import { PaginatedResult } from '../../../common/types/api-response.type';
import {
  NewNewsletterSubscriber,
  NewTestimonial,
  NewVolunteerApplication,
  NewsletterSubscriber,
  Testimonial,
  VolunteerApplication,
} from '../../../database/schema';

export const ENGAGEMENT_REPOSITORY = Symbol('ENGAGEMENT_REPOSITORY');

export interface ListCriteria {
  page: number;
  limit: number;
  offset: number;
  sortOrder: 'asc' | 'desc';
}

export interface VolunteerCriteria extends ListCriteria {
  status?: VolunteerApplication['status'];
  languageCode?: VolunteerApplication['languageCode'];
  search?: string;
}

export interface TestimonialCriteria extends ListCriteria {
  languageCode: Testimonial['languageCode'];
  status?: Testimonial['status'];
}

export interface EngagementRepository {
  createApplication(data: NewVolunteerApplication): Promise<VolunteerApplication>;
  listApplications(criteria: VolunteerCriteria): Promise<PaginatedResult<VolunteerApplication>>;
  deleteApplication(id: string, actorId: string): Promise<boolean>;
  listTestimonials(
    criteria: TestimonialCriteria,
    publicOnly: boolean,
  ): Promise<PaginatedResult<Testimonial>>;
  createTestimonial(data: NewTestimonial, actorId: string): Promise<Testimonial>;
  updateTestimonial(
    id: string,
    data: Partial<NewTestimonial>,
    actorId: string,
  ): Promise<Testimonial | null>;
  deleteTestimonial(id: string, actorId: string): Promise<boolean>;
  createSubscriber(data: NewNewsletterSubscriber): Promise<NewsletterSubscriber>;
  listSubscribers(criteria: ListCriteria): Promise<PaginatedResult<NewsletterSubscriber>>;
  deleteSubscriber(email: string, actorId: string): Promise<boolean>;
}
