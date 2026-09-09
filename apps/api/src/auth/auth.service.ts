import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import type { SignupDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto/auth.dto.js';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

@Injectable()
export class AuthService {
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

    // Send verification email asynchronously; don't block signup.
    this.sendVerificationEmail(user.id, user.email).catch(() => null);

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

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
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Password Reset                                                     */
  /* ------------------------------------------------------------------ */

  private generateResetCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private buildResetEmail({ username, code, resetLink, expiresAt }: { username: string; code: string; resetLink: string; expiresAt: Date }): { html: string; text: string } {
    const expiryTime = expiresAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const expiryDate = expiresAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
              <p style="margin:0 0 24px 0;color:#555;font-size:15px;line-height:1.6;">Hi <strong>${username}</strong>, we received a request to reset your CricApp password. Use the 4-digit code below to complete the reset.</p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#f0f7f0;border:2px dashed #2e8b47;border-radius:8px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px 0;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Reset Code</p>
                    <p style="margin:0;color:#1a5f2a;font-size:42px;font-weight:800;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px 0;color:#555;font-size:15px;line-height:1.6;">Enter this code in the app or on the website to set a new password. This code will expire at <strong>${expiryTime}</strong> on <strong>${expiryDate}</strong>.</p>

              <!-- Alternative Link -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 12px 0;color:#777;font-size:13px;">Or click the button below to reset directly:</p>
                    <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#1a5f2a 0%,#2e8b47 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.5px;">Reset Password</a>
                  </td>
                </tr>
              </table>

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

Your password reset code is: ${code}

Enter this code in the app to reset your password. This code expires at ${expiryTime} on ${expiryDate}.

Alternatively, use this link: ${resetLink}

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
    const resetCode = this.generateResetCode();
    const [tokenHash, codeHash] = await Promise.all([
      bcrypt.hash(rawToken, 10),
      bcrypt.hash(resetCode, 10),
    ]);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    const tokenRecord = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, codeHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${rawToken}&tid=${tokenRecord.id}`;

    const { html, text } = this.buildResetEmail({
      username: user.displayName || user.username,
      code: resetCode,
      resetLink,
      expiresAt,
    });

    await this.mailer.sendMail({
      to: user.email,
      subject: '🔐 Your CricApp Password Reset Code',
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

    let valid = false;

    if (dto.code && token.codeHash) {
      valid = await bcrypt.compare(dto.code, token.codeHash);
    } else if (dto.token) {
      valid = await bcrypt.compare(dto.token, token.tokenHash);
    }

    if (!valid) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

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

    await this.sendVerificationEmail(user.id, user.email);
    return { message: 'If an account exists, a verification email has been sent.' };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const rawToken = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    const tokenRecord = await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const verifyLink = `${appUrl}/verify-email?token=${rawToken}&tid=${tokenRecord.id}`;

    await this.mailer.sendMail({
      to: email,
      subject: 'Verify your CricApp email address',
      html: `<p>Welcome to CricApp!</p>
             <p>Please verify your email address by clicking the link below:</p>
             <p><a href="${verifyLink}">Verify Email</a></p>
             <p>This link expires in 24 hours.</p>`,
      text: `Verify your email: ${verifyLink}`,
    });
  }

  private buildAuthResponse(user: { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; isAdmin: boolean; emailVerified?: boolean }) {
    const payload = { sub: user.id, email: user.email, username: user.username, isAdmin: user.isAdmin };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified ?? false,
      },
    };
  }
}
