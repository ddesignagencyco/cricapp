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
import { BRAND, emailButton, emailCode, emailLinkFallback, emailNote, renderEmail } from '../mailer/email-layout.js';
import type { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

/** Wrong guesses allowed on one emailed code before it stops working (the link still works). */
const CODE_MAX_ATTEMPTS = 5;

type CodeRecord = { id: string; codeHash: string | null; codeAttempts: number };

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
    const verification = await this.createVerification(user.id);
    this.sendVerificationEmail(
      user.email,
      user.displayName ?? user.username,
      verification,
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

  private buildResetEmail({ username, resetLink, code, expiresAt }: { username: string; resetLink: string; code: string; expiresAt: Date }): { html: string; text: string } {
    const expiryTime = expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const expiryDate = expiresAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const safeUsername = this.escapeHtml(username);

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const html = renderEmail({
      appUrl,
      title: 'Reset your PakCricZone password',
      preheader: `Use this secure link or code to choose a new password. It expires at ${expiryTime}.`,
      reason: 'You received this email because a password reset was requested for your PakCricZone account.',
      bodyHtml: `
        <h1 style="margin:0 0 6px;font-size:24px;line-height:1.3;color:${BRAND.ink};">Reset your password</h1>
        <p style="margin:0 0 4px;">Hi <strong style="color:${BRAND.ink};">${safeUsername}</strong>,</p>
        <p style="margin:0;">We received a request to reset the password for your PakCricZone account. Click the button below to choose a new one.</p>
        ${emailButton(resetLink, 'Reset password')}
        <p style="margin:0;text-align:center;">Using the PakCricZone app? Enter this code instead:</p>
        ${emailCode(code, 'Reset code')}
        ${emailNote(`This link and code expire at <strong>${expiryTime}</strong> on <strong>${expiryDate}</strong> and can only be used once. Never share the code with anyone.`)}
        ${emailNote("<strong>Didn't request this?</strong> You can safely ignore this email. Your password stays the same and your account is secure.", 'warning')}
        ${emailLinkFallback(resetLink)}`,
    });

    const text = `Reset your PakCricZone password

Hi ${username},

We received a request to reset your password. Use this secure link:
${resetLink}

Using the PakCricZone app? Enter this code instead: ${code}

This link and code expire at ${expiryTime} on ${expiryDate} and can only be used once.
Never share the code with anyone.

Didn't request this? Ignore this email. Your password stays the same.

PakCricZone — Every run. Every ball. Live.`;

    return { html, text };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If an account exists, a reset email has been sent.' };
    }

    // Only the newest email works: retire older links and codes so their
    // remaining code attempts cannot be added up.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomUUID();
    const code = this.generateCode();
    const [tokenHash, codeHash] = await Promise.all([bcrypt.hash(rawToken, 10), bcrypt.hash(code, 10)]);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, codeHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${rawToken}&tid=${tokenRecord.id}`;

    const { html, text } = this.buildResetEmail({
      username: user.displayName || user.username,
      resetLink,
      code,
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
    const token = dto.tokenId && dto.token
      ? await this.findResetTokenByLink(dto.tokenId, dto.token)
      : await this.findResetTokenByCode(dto.email, dto.code);

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

  private async findResetTokenByLink(tokenId: string, rawToken: string) {
    const token = await this.prisma.passwordResetToken.findUnique({ where: { id: tokenId } });
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }
    const valid = await bcrypt.compare(rawToken, token.tokenHash);
    if (!valid) throw new BadRequestException('Invalid or expired token');
    return token;
  }

  private async findResetTokenByCode(email: string | undefined, code: string | undefined) {
    const invalid = new BadRequestException('Invalid or expired code');
    if (!email || !code) throw invalid;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw invalid;
    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const valid = await this.matchCode(token, code, (id) =>
      this.prisma.passwordResetToken.updateMany({
        where: { id, codeAttempts: { lt: CODE_MAX_ATTEMPTS } },
        data: { codeAttempts: { increment: 1 } },
      }),
    );
    if (!token || !valid) throw invalid;
    return token;
  }

  /* ------------------------------------------------------------------ */
  /* Email Verification                                                 */
  /* ------------------------------------------------------------------ */

  async verifyEmail(dto: VerifyEmailDto) {
    if (!(dto.tokenId && dto.token)) return this.verifyEmailByCode(dto.email, dto.code);

    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { id: dto.tokenId },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const valid = await bcrypt.compare(dto.token, token.tokenHash);
    if (!valid) throw new BadRequestException('Invalid or expired verification token');

    await this.markEmailVerified(token, 'Invalid or expired verification token');
    return { message: 'Email verified successfully.' };
  }

  private async verifyEmailByCode(email: string | undefined, code: string | undefined) {
    const invalid = 'Invalid or expired verification code';
    if (!email || !code) throw new BadRequestException(invalid);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException(invalid);
    // Same answer resend-verification already gives for a verified address.
    if (user.emailVerified) return { message: 'Email is already verified.' };

    const token = await this.prisma.emailVerificationToken.findUnique({ where: { userId: user.id } });
    const live = token && !token.usedAt && token.expiresAt > new Date() ? token : null;
    const valid = await this.matchCode(live, code, (id) =>
      this.prisma.emailVerificationToken.updateMany({
        where: { id, codeAttempts: { lt: CODE_MAX_ATTEMPTS } },
        data: { codeAttempts: { increment: 1 } },
      }),
    );
    if (!live || !valid) throw new BadRequestException(invalid);

    await this.markEmailVerified(live, invalid);
    return { message: 'Email verified successfully.' };
  }

  /** Claims the token once (link and code can race) and flips the user to verified. */
  private async markEmailVerified(token: { id: string; userId: string }, invalidMessage: string) {
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException(invalidMessage);
      await transaction.user.update({
        where: { id: token.userId },
        data: { emailVerified: true },
      });
    });
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }
    if (user.emailVerified) {
      return { message: 'Email is already verified.' };
    }

    const verification = await this.createVerification(user.id);
    await this.sendVerificationEmail(
      user.email,
      user.displayName ?? user.username,
      verification,
    );
    return { message: 'If an account exists, a verification email has been sent.' };
  }

  private buildVerificationEmail({
    username,
    verifyLink,
    code,
  }: {
    username: string;
    verifyLink: string;
    code: string;
  }): { html: string; text: string } {
    const safeUsername = this.escapeHtml(username);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const html = renderEmail({
      appUrl,
      title: 'Verify your PakCricZone email',
      preheader: 'One click (or one code) to activate your account and start following live cricket.',
      reason: 'You received this email because someone signed up for PakCricZone with this address.',
      bodyHtml: `
        <h1 style="margin:0 0 6px;font-size:24px;line-height:1.3;color:${BRAND.ink};">Confirm your email</h1>
        <p style="margin:0 0 4px;">Hi <strong style="color:${BRAND.ink};">${safeUsername}</strong>,</p>
        <p style="margin:0;">Welcome to PakCricZone! Confirm your email address to activate your account and start following live matches, your favourite teams and players, and the latest cricket news.</p>
        ${emailButton(verifyLink, 'Verify email address')}
        <p style="margin:0;text-align:center;">Using the PakCricZone app? Enter this code instead:</p>
        ${emailCode(code, 'Verification code')}
        ${emailNote('This link and code expire in <strong>24 hours</strong> and can only be used once. If you did not create a PakCricZone account, you can safely ignore this email.')}
        ${emailLinkFallback(verifyLink)}`,
    });
    const text = `Welcome to PakCricZone, ${username}!

Confirm your email address to activate your account:
${verifyLink}

Using the PakCricZone app? Enter this code instead: ${code}

This link and code expire in 24 hours and can only be used once.
If you did not create a PakCricZone account, ignore this email.

PakCricZone — Every run. Every ball. Live.`;
    return { html, text };
  }

  private async createVerification(userId: string): Promise<{ link: string; code: string }> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const rawToken = crypto.randomUUID();
    const code = this.generateCode();
    const [tokenHash, codeHash] = await Promise.all([bcrypt.hash(rawToken, 10), bcrypt.hash(code, 10)]);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    const tokenRecord = await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, codeHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return { link: `${appUrl}/verify-email?token=${rawToken}&tid=${tokenRecord.id}`, code };
  }

  private async sendVerificationEmail(
    email: string,
    username: string,
    verification: { link: string; code: string },
  ) {
    const { html, text } = this.buildVerificationEmail({
      username,
      verifyLink: verification.link,
      code: verification.code,
    });

    await this.mailer.sendMail({
      to: email,
      subject: 'Verify your PakCricZone email',
      html,
      text,
    });
  }

  /* ------------------------------------------------------------------ */
  /* One-time codes                                                     */
  /* ------------------------------------------------------------------ */

  private generateCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * Spends one attempt before comparing, so parallel guesses cannot slip past the
   * limit. `claimAttempt` must increment only while attempts remain.
   */
  private async matchCode(
    record: CodeRecord | null,
    code: string,
    claimAttempt: (id: string) => Promise<{ count: number }>,
  ): Promise<boolean> {
    if (!record?.codeHash) return false;
    const claimed = await claimAttempt(record.id);
    if (claimed.count !== 1) return false;
    return bcrypt.compare(code, record.codeHash);
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
