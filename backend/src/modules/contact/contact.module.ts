import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CmsModule } from '../cms/cms.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminContactController } from './controllers/admin-contact.controller';
import { PublicContactController } from './controllers/public-contact.controller';
import { CONTACT_REPOSITORY } from './interfaces/contact-repository.interface';
import { DrizzleContactRepository } from './repositories/drizzle-contact.repository';
import { ContactService } from './services/contact.service';

@Module({
  imports: [AuthModule, CmsModule, SettingsModule],
  controllers: [PublicContactController, AdminContactController],
  providers: [
    ContactService,
    {
      provide: CONTACT_REPOSITORY,
      useClass: DrizzleContactRepository,
    },
  ],
})
export class ContactModule {}
