import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DonationService } from '../services/donation.service';

export function trialPaymentRoutesEnabled(
  environment = process.env.NODE_ENV,
  trialMode = process.env.TRIAL_MODE,
): boolean {
  return environment !== 'production' && (environment === 'test' || trialMode === 'true');
}

/**
 * Development-only controls for the fake gateway. The module never registers
 * this controller in production, so these endpoints cannot enter its route table.
 */
@ApiTags('Trial payment simulation (never production)')
@Controller('test/payments')
export class TestPaymentController {
  constructor(private readonly donations: DonationService) {}

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a fake donation and email its test receipt to Mailpit' })
  @ApiResponse({
    status: 201,
    description: 'Fake confirmation result, duplicate flag, and local test receipt URL',
  })
  @ApiResponse({ status: 409, description: 'Donation is already in another terminal state' })
  confirm(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.donations.simulate(id, 'CONFIRMED');
  }

  @Post(':id/fail')
  @ApiOperation({ summary: 'Fail a fake donation without contacting a payment provider' })
  @ApiResponse({ status: 201, description: 'Fake failure result; no money is transferred' })
  fail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.donations.simulate(id, 'FAILED');
  }
}
