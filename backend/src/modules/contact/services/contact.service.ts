import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CmsPagesService } from '../../cms/services/cms-pages.service';
import { SiteSettingsService } from '../../settings/services/site-settings.service';
import { ContactQueryDto } from '../dto/contact-query.dto';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { CONTACT_REPOSITORY, ContactRepository } from '../interfaces/contact-repository.interface';

@Injectable()
export class ContactService {
  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contacts: ContactRepository,
    private readonly pages: CmsPagesService,
    private readonly settings: SiteSettingsService,
  ) {}

  async getPublicPage(languageCode: 'en' | 'am') {
    const [page, settings] = await Promise.all([
      this.pages.findPublicPage('contact', languageCode),
      this.settings.getPublic(),
    ]);

    return {
      title: page.title,
      description: page.content,
      email: settings.contactEmail,
      phone: settings.phone,
      address: settings.address,
      mapEmbedUrl: this.safeMapUrl(page.metadata.mapEmbedUrl),
      bannerImageUrl: stringOrNull(page.metadata.bannerImageUrl),
      languageCode: page.languageCode,
    };
  }

  async submit(dto: CreateContactSubmissionDto): Promise<{ status: 'submitted' }> {
    await this.contacts.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      subject: dto.subject?.trim() || null,
      message: dto.message.trim(),
      languageCode: dto.languageCode,
    });

    return { status: 'submitted' };
  }

  list(query: ContactQueryDto) {
    return this.contacts.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      languageCode: query.languageCode,
      search: query.search?.trim(),
    });
  }

  async delete(id: string, actor: AdminPrincipal): Promise<{ message: string }> {
    if (!(await this.contacts.delete(id, actor.id))) {
      throw new NotFoundException(`Contact submission ${id} was not found`);
    }
    return { message: 'Contact submission deleted successfully' };
  }

  private safeMapUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    try {
      const url = new URL(value);
      const hostname = url.hostname.toLowerCase();
      return url.protocol === 'https:' &&
        (hostname === 'google.com' ||
          hostname.endsWith('.google.com') ||
          hostname === 'googleusercontent.com' ||
          hostname.endsWith('.googleusercontent.com'))
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
