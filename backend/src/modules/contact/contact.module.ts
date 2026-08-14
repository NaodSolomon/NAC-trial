import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CmsModule } from '../cms/cms.module';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../mail/mail.module';
import { AdminContactController } from './controllers/admin-contact.controller';
import { PublicContactController } from './controllers/public-contact.controller';
import { CONTACT_REPOSITORY } from './interfaces/contact-repository.interface';
import { CONTACT_NOTIFICATION_OUTBOX_REPOSITORY } from './interfaces/contact-notification-outbox-repository.interface';
import { DrizzleContactRepository } from './repositories/drizzle-contact.repository';
import { PostgresContactNotificationOutboxRepository } from './repositories/postgres-contact-notification-outbox.repository';
import { ContactNotificationOutboxService } from './services/contact-notification-outbox.service';
import { ContactService } from './services/contact.service';

@Module({
  imports: [AuthModule, CmsModule, SettingsModule, MailModule],
  controllers: [PublicContactController, AdminContactController],
  providers: [
    ContactService,
    ContactNotificationOutboxService,
    {
      provide: CONTACT_REPOSITORY,
      useClass: DrizzleContactRepository,
    },
    {
      provide: CONTACT_NOTIFICATION_OUTBOX_REPOSITORY,
      useClass: PostgresContactNotificationOutboxRepository,
    },
  ],
})
export class ContactModule {}
