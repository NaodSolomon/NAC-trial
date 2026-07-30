import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CurrentAdmin } from '../../../common/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AdminPrincipal, AuthenticationContext } from '../interfaces/auth.types';
import { AuthenticationResponse, AuthService } from '../services/auth.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate an administrator with email and password' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens issued' })
  @ApiResponse({ status: 401, description: 'Credentials rejected or account locked' })
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthenticationResponse> {
    return this.authService.login(dto, this.context(request, userAgent));
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new token pair' })
  @ApiResponse({ status: 200, description: 'Refresh token rotated and a new token pair issued' })
  @ApiResponse({ status: 401, description: 'Refresh token is invalid, expired, or revoked' })
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: FastifyRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthenticationResponse> {
    return this.authService.refresh(dto.refreshToken, this.context(request, userAgent));
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke an authenticated refresh-token session' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated administrator principal' })
  @ApiBearerAuth('admin-jwt')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAdmin() admin: AdminPrincipal): AdminPrincipal {
    return admin;
  }

  private context(request: FastifyRequest, userAgent?: string): AuthenticationContext {
    return {
      ipAddress: request.ip,
      userAgent,
    };
  }
}
