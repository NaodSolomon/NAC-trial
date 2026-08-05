import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PasswordResetConfirmDto, PasswordResetRequestDto } from '../dto/password-reset.dto';
import { PasswordResetService } from '../services/password-reset.service';

@ApiTags('Authentication')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Request generic password-reset instructions' })
  @ApiOkResponse({
    description: 'The same response is returned whether or not the administrator exists',
  })
  request(@Body() dto: PasswordResetRequestDto): Promise<{ message: string }> {
    return this.passwordReset.request(dto.email);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Consume a single-use password-reset token' })
  @ApiOkResponse({ description: 'Password changed and existing sessions revoked' })
  @ApiBadRequestResponse({ description: 'Token is invalid, expired, or already used' })
  confirm(@Body() dto: PasswordResetConfirmDto): Promise<{ message: string }> {
    return this.passwordReset.confirm(dto);
  }
}
