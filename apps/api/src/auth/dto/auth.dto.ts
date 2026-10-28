import { IsEmail, IsString, MinLength, IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    emailVerified: boolean;
  };
}

export class SignupResponseDto {
  @ApiProperty({ example: 'Account created. Check your email to verify your account.' })
  message: string;

  @ApiProperty()
  user: AuthResponseDto['user'];
}

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  displayName: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

/** Link pair from the email (web) — sent instead of email + code. */
const usesLink = (dto: { tokenId?: string; token?: string }) => Boolean(dto.tokenId || dto.token);
/** Email + 6-digit code (apps) — validated whenever sent, and required without a link. */
const usesCode = (dto: { tokenId?: string; token?: string; email?: string; code?: string }) =>
  dto.email !== undefined || dto.code !== undefined || !usesLink(dto);
const SIX_DIGITS = /^\d{6}$/;

export class ResetPasswordDto {
  @ApiPropertyOptional({ example: 'token-id-uuid', description: 'The `tid` from the reset link. Send with `token`, or send `email` + `code` instead.' })
  @ValidateIf(usesLink)
  @IsString()
  tokenId?: string;

  @ApiPropertyOptional({ example: 'reset-secret-uuid', description: 'The `token` from the reset link.' })
  @ValidateIf(usesLink)
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Account email, sent with `code`.' })
  @ValidateIf(usesCode)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '482913', description: '6-digit code from the reset email.' })
  @ValidateIf(usesCode)
  @Matches(SIX_DIGITS, { message: 'code must be 6 digits' })
  code?: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class VerifyEmailDto {
  @ApiPropertyOptional({ example: 'token-id-uuid', description: 'The `tid` from the verification link. Send with `token`, or send `email` + `code` instead.' })
  @ValidateIf(usesLink)
  @IsString()
  tokenId?: string;

  @ApiPropertyOptional({ example: 'verify-secret-uuid', description: 'The `token` from the verification link.' })
  @ValidateIf(usesLink)
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Account email, sent with `code`.' })
  @ValidateIf(usesCode)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '482913', description: '6-digit code from the verification email.' })
  @ValidateIf(usesCode)
  @Matches(SIX_DIGITS, { message: 'code must be 6 digits' })
  code?: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;
}
