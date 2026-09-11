import { Controller, Post, Get, Patch, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Public } from './public.decorator.js';
import {
  SignupDto,
  LoginDto,
  AuthResponseDto,
  UserProfileDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  MessageResponseDto,
  UpdateProfileDto,
} from './dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created.', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email or username already taken.' })
  async signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile.', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async me(@Request() req: { user: { id: string } }): Promise<UserProfileDto> {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated profile.', type: UserProfileDto })
  async updateMe(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists.', type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using token or 4-digit code from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token from email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent if account exists.', type: MessageResponseDto })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<MessageResponseDto> {
    return this.authService.resendVerification(dto);
  }
}
