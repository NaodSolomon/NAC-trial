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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthenticationResponse> {
    return this.authService.login(dto, this.context(request, userAgent));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: FastifyRequest,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthenticationResponse> {
    return this.authService.refresh(dto.refreshToken, this.context(request, userAgent));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
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
