import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') || 'SEG Academy <no-reply@segacademy.com>';

    // Check if real SMTP credentials are provided (and not dummy placeholders)
    if (host && host !== 'smtp.example.com' && user && pass && pass !== 'your-smtp-password-placeholder') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
      this.logger.log(`SMTP transporter initialized for host: ${host}:${port}`);
    } else {
      this.isConfigured = false;
      this.logger.log('SMTP not fully configured with production credentials. Operating in development/safe mode.');
    }
  }

  /**
   * Sends an email or safely records sending in development mode.
   * Throws an error if sending fails when transporter is active.
   */
  async sendMail(options: SendMailOptions): Promise<{ messageId: string; delivered: boolean }> {
    if (!this.isConfigured || !this.transporter) {
      // Development safe mode: simulate delivery without leaking secret tokens in production logs
      const devMessageId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      this.logger.log(
        `[DevEmailTransport] Simulated email delivery to: ${options.to} | Subject: "${options.subject}" | MessageId: ${devMessageId}`,
      );
      return { messageId: devMessageId, delivered: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email dispatched successfully to ${options.to}. MessageId: ${info.messageId}`);
      return { messageId: info.messageId, delivered: true };
    } catch (err: any) {
      this.logger.error(`Failed to dispatch email to ${options.to}: ${err.message}`, err.stack);
      throw new Error(`Email delivery failed: ${err.message}`);
    }
  }

  /**
   * Generates a branded HTML template for Password Reset emails.
   */
  renderPasswordResetEmail(recipientName: string, resetLink: string, expiryMinutes: number): { text: string; html: string } {
    const text = `Hello ${recipientName},\n\nWe received a request to reset your SEG CRM account password.\n\nPlease use the following link within ${expiryMinutes} minutes to choose a new password:\n${resetLink}\n\nIf you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nSEG Academy Security Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">SEG CRM — Security Notification</h1>
    </div>
    <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
      <p style="font-size: 16px; margin-top: 0;">Hello <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px;">We received a request to reset the password associated with your SEG CRM account.</p>
      <p style="font-size: 15px;">Click the button below within <strong>${expiryMinutes} minutes</strong> to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:<br/><span style="word-break: break-all; color: #2563eb;">${resetLink}</span></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">If you did not request this password reset, please ignore this email or notify your system administrator immediately.</p>
    </div>
  </div>
</body>
</html>
`;
    return { text, html };
  }

  /**
   * Generates a branded HTML template for Email Verification emails.
   */
  renderEmailVerificationEmail(recipientName: string, verifyLink: string, expiryHours: number): { text: string; html: string } {
    const text = `Hello ${recipientName},\n\nThank you for joining SEG CRM.\n\nPlease verify your email address by opening the following link within ${expiryHours} hours:\n${verifyLink}\n\nIf you did not register for an account, please contact our administrator.\n\nBest regards,\nSEG Academy Team`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">SEG CRM — Email Verification</h1>
    </div>
    <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
      <p style="font-size: 16px; margin-top: 0;">Hello <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px;">Please confirm your email address to complete your registration on SEG CRM.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">This verification link will expire in <strong>${expiryHours} hours</strong>.</p>
      <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:<br/><span style="word-break: break-all; color: #16a34a;">${verifyLink}</span></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">If you did not create an account with SEG CRM, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
`;
    return { text, html };
  }
}
