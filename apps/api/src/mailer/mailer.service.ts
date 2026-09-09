import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly provider: string;
  private readonly from: string;
  private smtpTransporter?: Transporter;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('EMAIL_PROVIDER', 'console');
    this.from = this.config.get<string>('EMAIL_FROM', 'noreply@cricapp.com');

    if (this.provider === 'smtp') {
      const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
      const port = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
      this.smtpTransporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port,
        secure,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
        tls: {
          // Allow STARTTLS on port 587 even if secure is false
          rejectUnauthorized: true,
        },
      });
      this.logger.log(`SMTP configured: ${this.config.get<string>('SMTP_HOST')}:${port} (secure=${secure})`);
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (this.provider === 'console') {
      this.logger.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      this.logger.debug(options.html);
      return;
    }

    if (this.provider === 'smtp') {
      await this.smtpTransporter!.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return;
    }

    if (this.provider === 'resend') {
      await this.sendViaResend(options);
      return;
    }

    if (this.provider === 'sendgrid') {
      await this.sendViaSendGrid(options);
      return;
    }

    throw new Error(`Unknown email provider: ${this.provider}`);
  }

  private async sendViaResend(options: SendMailOptions): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error (${res.status}): ${body}`);
    }
  }

  private async sendViaSendGrid(options: SendMailOptions): Promise<void> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) throw new Error('SENDGRID_API_KEY is not configured');

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: this.from },
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || '' },
          { type: 'text/html', value: options.html },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SendGrid API error (${res.status}): ${body}`);
    }
  }
}
