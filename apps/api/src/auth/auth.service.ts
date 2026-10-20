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
import { BRAND, emailButton, emailLinkFallback, emailNote, renderEmail } from '../mailer/email-layout.js';
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

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const html = renderEmail({
      appUrl,
      title: 'Reset your PakCricZone password',
      preheader: `Use this secure link to choose a new password. It expires at ${expiryTime}.`,
      reason: 'You received this email because a password reset was requested for your PakCricZone account.',
      bodyHtml: `
        <h1 style="margin:0 0 6px;font-size:24px;line-height:1.3;color:${BRAND.ink};">Reset your password</h1>
        <p style="margin:0 0 4px;">Hi <strong style="color:${BRAND.ink};">${safeUsername}</strong>,</p>
        <p style="margin:0;">We received a request to reset the password for your PakCricZone account. Click the button below to choose a new one.</p>
        ${emailButton(resetLink, 'Reset password')}
        ${emailNote(`This secure link expires at <strong>${expiryTime}</strong> on <strong>${expiryDate}</strong> and can only be used once.`)}
        ${emailNote("<strong>Didn't request this?</strong> You can safely ignore this email. Your password stays the same and your account is secure.", 'warning')}
        ${emailLinkFallback(resetLink)}`,
    });

    const text = `Reset your PakCricZone password

Hi ${username},

We received a request to reset your password. Use this secure link:
${resetLink}

This link expires at ${expiryTime} on ${expiryDate} and can only be used once.

Didn't request this? Ignore this email. Your password stays the same.

PakCricZone — Every run. Every ball. Live.`;

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
      subject: 'Reset your PakCricZone password',
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
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const html = renderEmail({
      appUrl,
      title: 'Verify your PakCricZone email',
      preheader: 'One click to activate your account and start following live cricket.',
      reason: 'You received this email because someone signed up for PakCricZone with this address.',
      bodyHtml: `
        <h1 style="margin:0 0 6px;font-size:24px;line-height:1.3;color:${BRAND.ink};">Confirm your email</h1>
        <p style="margin:0 0 4px;">Hi <strong style="color:${BRAND.ink};">${safeUsername}</strong>,</p>
        <p style="margin:0;">Welcome to PakCricZone! Confirm your email address to activate your account and start following live matches, your favourite teams and players, and the latest cricket news.</p>
        ${emailButton(verifyLink, 'Verify email address')}
        ${emailNote('This link expires in <strong>24 hours</strong> and can only be used once. If you did not create a PakCricZone account, you can safely ignore this email.')}
        ${emailLinkFallback(verifyLink)}`,
    });
    const text = `Welcome to PakCricZone, ${username}!

Confirm your email address to activate your account:
${verifyLink}

This link expires in 24 hours and can only be used once.
If you did not create a PakCricZone account, ignore this email.

PakCricZone — Every run. Every ball. Live.`;
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
      subject: 'Verify your PakCricZone email',
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
