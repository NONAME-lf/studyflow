import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { MailService } from '../mail/mail.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DAY_MS, RemindersService } from './reminders.service.js';

const NOW = new Date('2026-11-12T12:00:00Z');
const user = {
  id: 'user-1',
  email: 'artem@studyflow.dev',
  fullName: 'Мекшаков Артемій',
  reminderDaysBefore: 2,
};

function makeDeadline(id: string) {
  return {
    id,
    title: `Дедлайн ${id}`,
    dueAt: new Date(NOW.getTime() + DAY_MS),
    subject: { name: 'Бази даних' },
    group: { name: 'МІ-41' },
  };
}

describe('RemindersService', () => {
  const prisma = mockDeep<PrismaService>();
  const mail = mockDeep<MailService>();
  const service = new RemindersService(prisma, mail, new ConfigService({}));

  const whereOfFirstQuery = () => prisma.deadline.findMany.mock.calls[0][0]?.where?.AND;

  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  beforeEach(() => {
    mockReset(prisma);
    mockReset(mail);
    prisma.user.findMany.mockResolvedValue([user] as never);
  });

  it('UT-31 picks only deadlines inside the N-day window', async () => {
    prisma.deadline.findMany.mockResolvedValue([]);

    await service.run(NOW);

    expect(whereOfFirstQuery()).toEqual(
      expect.arrayContaining([{ dueAt: { gte: NOW, lte: new Date(NOW.getTime() + 2 * DAY_MS) } }]),
    );
  });

  it('UT-32 skips completed deadlines and users with reminders off', async () => {
    prisma.deadline.findMany.mockResolvedValue([]);

    await service.run(NOW);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reminderEnabled: true } }),
    );
    expect(whereOfFirstQuery()).toEqual(
      expect.arrayContaining([{ completions: { none: { userId: user.id } } }]),
    );
  });

  it('UT-33 does not send twice: pairs with a ReminderLog are skipped, new ones are logged', async () => {
    prisma.deadline.findMany.mockResolvedValue([makeDeadline('d1')] as never);
    mail.send.mockResolvedValue(undefined);

    const result = await service.run(NOW);

    expect(whereOfFirstQuery()).toEqual(
      expect.arrayContaining([{ reminderLogs: { none: { userId: user.id } } }]),
    );
    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(prisma.reminderLog.create).toHaveBeenCalledWith({
      data: { deadlineId: 'd1', userId: user.id },
    });
  });

  it('UT-34 one failed e-mail does not stop the others', async () => {
    prisma.deadline.findMany.mockResolvedValue([makeDeadline('d1'), makeDeadline('d2')] as never);
    mail.send.mockRejectedValueOnce(new Error('SMTP down')).mockResolvedValueOnce(undefined);

    const result = await service.run(NOW);

    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(prisma.reminderLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.reminderLog.create).toHaveBeenCalledWith({
      data: { deadlineId: 'd2', userId: user.id },
    });
  });
});
