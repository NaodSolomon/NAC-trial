import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import {
  AdminDonationController,
  DonationWebhookController,
  PublicDonationController,
} from './controllers/donation.controllers';
import { PayPalGateway } from './gateways/paypal.gateway';
import { DONATION_REPOSITORY } from './interfaces/donation-repository.interface';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';
import { DrizzleDonationRepository } from './repositories/drizzle-donation.repository';
import { DonationService } from './services/donation.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [PublicDonationController, DonationWebhookController, AdminDonationController],
  providers: [
    DonationService,
    { provide: DONATION_REPOSITORY, useClass: DrizzleDonationRepository },
    { provide: PAYMENT_GATEWAY, useClass: PayPalGateway },
  ],
})
export class DonationsModule {}
