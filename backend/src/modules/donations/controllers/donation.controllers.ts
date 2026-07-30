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
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Public Donations')
@Controller('public/donations')
export class PublicDonationController {
  constructor(private readonly service: DonationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a donation checkout without collecting payment credentials' })
  @ApiResponse({ status: 201, description: 'Donation ID and provider checkout URL' })
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

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class DonationWebhookController {
  constructor(private readonly service: DonationService) {}

  @Post('paypal')
  @ApiOperation({ summary: 'Accept a signature-verified PayPal or local fake payment event' })
  @ApiHeader({ name: 'paypal-transmission-id', required: true })
  @ApiHeader({ name: 'paypal-transmission-time', required: true })
  @ApiHeader({ name: 'paypal-transmission-sig', required: true })
  @ApiHeader({ name: 'paypal-cert-url', required: true, schema: { format: 'uri' } })
  @ApiHeader({ name: 'paypal-auth-algo', required: true, example: 'SHA256withRSA' })
  @ApiResponse({ status: 201, description: 'Event accepted; duplicate delivery is idempotent' })
  @ApiResponse({ status: 401, description: 'Webhook signature rejected' })
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

@ApiTags('Admin Donations')
@ApiBearerAuth('admin-jwt')
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
