import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { visibleTo } from '../deadlines/deadlines.service.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { reminderEmail } from './reminder-email.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReminderRunResult {
  sent: number;
  failed: number;
}

/** US-23: e-mail reminders N days before a deadline. */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private readonly appUrl: string;
  private readonly timeZone: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');
    this.timeZone = config.get<string>('APP_TIMEZONE') || undefined;
  }

  /**
   * R1: pairs (user, deadline) — visible, not done by the user, now ≤ dueAt ≤ now + N days,
   * reminders enabled, no ReminderLog yet. R2: one letter + one log row per pair.
   * R3: a failed letter is logged and does not stop the rest.
   */
  async run(now: Date = new Date()): Promise<ReminderRunResult> {
    const result: ReminderRunResult = { sent: 0, failed: 0 };
    const users = await this.prisma.user.findMany({
      where: { reminderEnabled: true },
      select: { id: true, email: true, fullName: true, reminderDaysBefore: true },
    });

    for (const user of users) {
      const until = new Date(now.getTime() + user.reminderDaysBefore * DAY_MS);
      const deadlines = await this.prisma.deadline.findMany({
        where: {
          AND: [
            visibleTo(user.id),
            { dueAt: { gte: now, lte: until } },
            { completions: { none: { userId: user.id } } },
            { reminderLogs: { none: { userId: user.id } } },
          ],
        },
        include: { subject: { select: { name: true } }, group: { select: { name: true } } },
        orderBy: { dueAt: 'asc' },
      });

      for (const deadline of deadlines) {
        try {
          await this.mail.send(
            reminderEmail({
              to: user.email,
              fullName: user.fullName,
              title: deadline.title,
              dueAt: deadline.dueAt,
              subjectName: deadline.subject?.name ?? null,
              groupName: deadline.group?.name ?? null,
              appUrl: this.appUrl,
              timeZone: this.timeZone,
            }),
          );
          await this.prisma.reminderLog.create({
            data: { deadlineId: deadline.id, userId: user.id },
          });
          result.sent++;
        } catch (error) {
          result.failed++;
          this.logger.error(
            `Reminder for deadline ${deadline.id} to user ${user.id} failed: ${String(error)}`,
          );
        }
      }
    }
    return result;
  }
}
