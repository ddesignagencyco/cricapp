import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import type { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already registered' : 'Username already taken',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        displayName: dto.displayName ?? dto.username,
      },
    });

    // Issue the token inside the request so it cannot outlive the user row,
    // then hand the slow SMTP call off so signup stays responsive.
    const verifyLink = await this.createVerificationLink(user.id);
    this.sendVerificationEmail(
      user.email,
      user.displayName ?? user.username,
      verifyLink,
    ).catch((error: unknown) => {
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return {
      message: 'Account created. Check your email to verify your account.',
      user: this.toAuthUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email address is not verified. Check your inbox or request a new verification link.',
      );
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: { displayName?: string; avatarUrl?: string; username?: string }) {
    if (dto.username) {
      const taken = await this.prisma.user.findFirst({
        where: { username: dto.username, id: { not: userId } },
      });
      if (taken) throw new ConflictException('Username already taken');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.username !== undefined && { username: dto.username }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Password Reset                                                     */
  /* ------------------------------------------------------------------ */

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[character]!,
    );
  }

  private buildResetEmail({ username, resetLink, expiresAt }: { username: string; resetLink: string; expiresAt: Date }): { html: string; text: string } {
    const expiryTime = expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const expiryDate = expiresAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const safeUsername = this.escapeHtml(username);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your CricApp Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a5f2a 0%,#2e8b47 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">🏏 CricApp</h1>
              <p style="margin:8px 0 0 0;color:#c8e6c9;font-size:14px;">Cricket News, Live Scores & Analytics</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 16px 0;color:#1a1a1a;font-size:22px;font-weight:600;">Password Reset Request</h2>
              <p style="margin:0 0 24px 0;color:#555;font-size:15px;line-height:1.6;">Hi <strong>${safeUsername}</strong>, we received a request to reset your CricApp password.</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="text-align:center;">
                    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a5f2a 0%,#2e8b47 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.5px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0;color:#555;font-size:15px;line-height:1.6;">This secure link expires at <strong>${expiryTime}</strong> on <strong>${expiryDate}</strong> and can only be used once.</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#fff8e1;border-left:4px solid #ffa000;border-radius:0 4px 4px 0;padding:16px;">
                    <p style="margin:0;color:#795548;font-size:13px;line-height:1.5;"><strong>Didn't request this?</strong> If you didn't ask for a password reset, you can safely ignore this email. Your account remains secure.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a3c1d;padding:30px;text-align:center;border-top:3px solid #2e8b47;">
              <p style="margin:0 0 8px 0;color:#a5d6a7;font-size:14px;font-weight:600;">🏏 CricApp — Your Cricket Companion</p>
              <p style="margin:0 0 12px 0;color:#81c784;font-size:12px;">Live Scores • Match Analytics • Player Stats • News & Updates</p>
              <p style="margin:0;color:#66bb6a;font-size:11px;">© ${new Date().getFullYear()} CricApp. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `CricApp Password Reset

Hi ${username},

Reset your password using this secure link:
${resetLink}

This link expires at ${expiryTime} on ${expiryDate} and can only be used once.

Didn't request this? Ignore this email — your account is safe.

---
CricApp — Your Cricket Companion
Live Scores • Match Analytics • Player Stats • News & Updates
© ${new Date().getFullYear()} CricApp`;

    return { html, text };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If an account exists, a reset email has been sent.' };
    }

    const rawToken = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${rawToken}&tid=${tokenRecord.id}`;

    const { html, text } = this.buildResetEmail({
      username: user.displayName || user.username,
      resetLink,
      expiresAt,
    });

    await this.mailer.sendMail({
      to: user.email,
      subject: 'Reset your CricApp password',
      html,
      text,
    });

    return { message: 'If an account exists, a reset email has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { id: dto.tokenId },
      include: { user: true },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const valid = await bcrypt.compare(dto.token, token.tokenHash);
    if (!valid) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or expired token');
      }
      await transaction.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });
    });

    return { message: 'Password has been reset successfully.' };
  }

  /* ------------------------------------------------------------------ */
  /* Email Verification                                                 */
  /* ------------------------------------------------------------------ */

  async verifyEmail(dto: VerifyEmailDto) {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { id: dto.tokenId },
      include: { user: true },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const valid = await bcrypt.compare(dto.token, token.tokenHash);
    if (!valid) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }
    if (user.emailVerified) {
      return { message: 'Email is already verified.' };
    }

    const verifyLink = await this.createVerificationLink(user.id);
    await this.sendVerificationEmail(
      user.email,
      user.displayName ?? user.username,
      verifyLink,
    );
    return { message: 'If an account exists, a verification email has been sent.' };
  }

  private buildVerificationEmail({
    username,
    verifyLink,
  }: {
    username: string;
    verifyLink: string;
  }): { html: string; text: string } {
    const safeUsername = this.escapeHtml(username);
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your CricApp email</title></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f7f6;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <tr><td style="background:linear-gradient(135deg,#1a5f2a,#2e8b47);padding:36px 30px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:28px;">🏏 CricApp</h1>
          <p style="margin:8px 0 0;color:#c8e6c9;font-size:14px;">Pakistan cricket, live scores, PSL and news</p>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Welcome to CricApp</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;">Hi <strong>${safeUsername}</strong>, verify your email to activate your account and start following live matches, teams, players and cricket news.</p>
          <p style="margin:28px 0;text-align:center;"><a href="${verifyLink}" style="display:inline-block;background:#2e8b47;color:#fff;text-decoration:none;padding:14px 36px;border-radius:6px;font-weight:600;">Verify Email Address</a></p>
          <p style="color:#777;font-size:13px;line-height:1.5;">This link expires in 24 hours and can only be used once. If you did not create a CricApp account, ignore this email.</p>
        </td></tr>
        <tr><td style="background:#1a3c1d;padding:24px;text-align:center;color:#a5d6a7;font-size:12px;">CricApp — Your Cricket Companion</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    const text = `Welcome to CricApp, ${username}!

Verify your email to activate your account:
${verifyLink}

This link expires in 24 hours and can only be used once.

CricApp — Your Cricket Companion`;
    return { html, text };
  }

  private async createVerificationLink(userId: string): Promise<string> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const rawToken = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    const tokenRecord = await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return `${appUrl}/verify-email?token=${rawToken}&tid=${tokenRecord.id}`;
  }

  private async sendVerificationEmail(
    email: string,
    username: string,
    verifyLink: string,
  ) {
    const { html, text } = this.buildVerificationEmail({
      username,
      verifyLink,
    });

    await this.mailer.sendMail({
      to: email,
      subject: 'Verify your CricApp email',
      html,
      text,
    });
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    emailVerified?: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified ?? false,
    };
  }

  private buildAuthResponse(user: Parameters<AuthService['toAuthUser']>[0]) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified ?? false,
    };
    return {
      token: this.jwt.sign(payload),
      user: this.toAuthUser(user),
    };
  }
}
