import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { MailModule } from '../mail/mail.module';
import {
  AdminDonationController,
  DonationWebhookController,
  PublicDonationController,
} from './controllers/donation.controllers';
import {
  TestPaymentController,
  trialPaymentRoutesEnabled,
} from './controllers/test-payment.controller';
import { PayPalGateway } from './gateways/paypal.gateway';
import { FakePaymentGateway } from './gateways/fake-payment.gateway';
import { ConfigService } from '@nestjs/config';
import { DONATION_REPOSITORY } from './interfaces/donation-repository.interface';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';
import { DrizzleDonationRepository } from './repositories/drizzle-donation.repository';
import { DonationService } from './services/donation.service';

@Module({
  imports: [AuthModule, MediaModule, MailModule],
  controllers: [
    PublicDonationController,
    DonationWebhookController,
    AdminDonationController,
    ...(trialPaymentRoutesEnabled() ? [TestPaymentController] : []),
  ],
  providers: [
    DonationService,
    { provide: DONATION_REPOSITORY, useClass: DrizzleDonationRepository },
    PayPalGateway,
    FakePaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, PayPalGateway, FakePaymentGateway],
      useFactory: (
        config: ConfigService,
        paypal: PayPalGateway,
        fake: FakePaymentGateway,
      ) => (config.get<string>('runtime.paymentDriver') === 'fake' ? fake : paypal),
    },
  ],
})
export class DonationsModule {}
