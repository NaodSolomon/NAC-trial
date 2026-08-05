import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import {
  PasswordResetApiResponseDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
} from '../dto/password-reset.dto';
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
    type: PasswordResetApiResponseDto,
    description: 'The same response is returned whether or not the administrator exists',
  })
  @ApiBadRequestResponse({ description: 'The email address failed request validation' })
  @ApiTooManyRequestsResponse({ description: 'The per-IP recovery request limit was exceeded' })
  request(@Body() dto: PasswordResetRequestDto): Promise<{ message: string }> {
    return this.passwordReset.request(dto.email);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Consume a single-use password-reset token' })
  @ApiOkResponse({
    type: PasswordResetApiResponseDto,
    description: 'Password changed and existing sessions revoked',
  })
  @ApiBadRequestResponse({ description: 'Token is invalid, expired, or already used' })
  @ApiTooManyRequestsResponse({ description: 'The per-IP confirmation limit was exceeded' })
  confirm(@Body() dto: PasswordResetConfirmDto): Promise<{ message: string }> {
    return this.passwordReset.confirm(dto);
  }
}
