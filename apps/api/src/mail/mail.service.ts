import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function createSmtpTransport(config: ConfigService) {
  const user = config.get<string>('SMTP_USER');
  return createTransport({
    host: config.get<string>('SMTP_HOST', 'localhost'),
    port: Number(config.get<string>('SMTP_PORT', '1025')),
    secure: config.get<string>('SMTP_SECURE') === 'true',
    ...(user && { auth: { user, pass: config.get<string>('SMTP_PASS', '') } }),
  });
}

/** SMTP via Nodemailer; in development it delivers to Mailpit (UI on :8025). */
@Injectable()
export class MailService {
  private readonly transport: ReturnType<typeof createSmtpTransport>;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.transport = createSmtpTransport(config);
    this.from = config.get<string>('MAIL_FROM', 'StudyFlow <no-reply@studyflow.dev>');
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}
