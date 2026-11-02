import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER', ''),
            pass: this.config.get<string>('SMTP_PASS', ''),
          }
        : undefined,
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@netorbit.local');
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email dispatched to ${to}: "${subject}"`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to send email to ${to}: ${err.message}. (Simulated in development)`);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const adminUrl = this.config.get<string>('ADMIN_URL', 'http://localhost:3000');
    const resetUrl = `${adminUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your NetOrbit account.</p>
        <p><a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>If you did not make this request, please disregard this email.</p>
        <p><small>Link expires in 1 hour.</small></p>
      </div>
    `;
    return this.sendMail(to, 'NetOrbit - Password Reset Request', html);
  }

  async sendUserInvitation(to: string, tempPass: string, tenantName: string): Promise<boolean> {
    const adminUrl = this.config.get<string>('ADMIN_URL', 'http://localhost:3000');
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to ${tenantName} on NetOrbit</h2>
        <p>You have been invited to access the ISP administration portal.</p>
        <p><strong>Your Temporary Credentials:</strong></p>
        <p>Email: ${to}<br/>Password: <code>${tempPass}</code></p>
        <p><a href="${adminUrl}/login" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Portal</a></p>
        <p>Please change your password immediately upon first login.</p>
      </div>
    `;
    return this.sendMail(to, `Invitation to ${tenantName} - NetOrbit`, html);
  }
}
