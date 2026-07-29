import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FastifyReply } from 'fastify';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { CreateDonationDto, DonationQueryDto } from '../dto/donation.dto';
import { DonationService } from '../services/donation.service';

@Controller('public/donations')
export class PublicDonationController {
  constructor(private readonly service: DonationService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  initiate(@Body() dto: CreateDonationDto) {
    return this.service.initiate(dto);
  }
  @Get('recent')
  recent() {
    return this.service.recent();
  }
  @Get('gateways')
  gateways() {
    return this.service.gateways();
  }
  @Get(':id')
  status(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.publicStatus(id);
  }
  @Post(':id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.cancel(id);
  }
}

@Controller('webhooks')
export class DonationWebhookController {
  constructor(private readonly service: DonationService) {}

  @Post('paypal')
  paypal(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() event: Record<string, unknown>,
  ) {
    const required = (name: string) => {
      const value = headers[name];
      return Array.isArray(value) ? value[0] : (value ?? '');
    };
    return this.service.paypalWebhook(
      {
        transmissionId: required('paypal-transmission-id'),
        transmissionTime: required('paypal-transmission-time'),
        transmissionSignature: required('paypal-transmission-sig'),
        certificateUrl: required('paypal-cert-url'),
        authenticationAlgorithm: required('paypal-auth-algo'),
      },
      event,
    );
  }

  @Post('telebirr')
  telebirrUnavailable(): never {
    throw new ServiceUnavailableException('Payment provider is not configured');
  }

  @Post('cbe')
  cbeUnavailable(): never {
    throw new ServiceUnavailableException('Payment provider is not configured');
  }
}

@Controller('admin/donations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'FINANCE_VIEWER')
export class AdminDonationController {
  constructor(private readonly service: DonationService) {}

  @Get()
  list(@Query() query: DonationQueryDto) {
    return this.service.list(query);
  }
  @Get('stats')
  stats() {
    return this.service.stats();
  }
  @Get('export')
  async export(@Query() query: DonationQueryDto, @Res() reply: FastifyReply) {
    const csv = await this.service.exportCsv(query);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="donations.csv"')
      .send(csv);
  }
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.requireDonation(id);
  }
  @Get(':id/receipt')
  receipt(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.receipt(id);
  }
  @Post(':id/resend-receipt')
  resend(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.resendReceipt(id, actor);
  }
  @Post(':id/verify')
  @Roles('SUPER_ADMIN')
  verify(@Param('id', new ParseUUIDPipe()) id: string, @CurrentAdmin() actor: AdminPrincipal) {
    return this.service.verify(id, actor);
  }
}
