import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaService } from '../prisma/prisma.service.js';
import { calculateProgress, ProgressService } from './progress.service.js';

describe('ProgressService', () => {
  const prisma = mockDeep<PrismaService>();
  const service = new ProgressService(prisma);
  const deadline = { id: 'deadline-1', groupId: 'group-1' };

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-27 2 of 4 members completed → 50 %', async () => {
    prisma.groupMember.count.mockResolvedValue(4);
    prisma.deadlineCompletion.count.mockResolvedValue(2);

    await expect(service.forDeadline(deadline)).resolves.toEqual({
      total: 4,
      completed: 2,
      percent: 50,
    });
    expect(calculateProgress(1, 3).percent).toBe(33);
  });

  it('UT-28 group without members → 0 %', async () => {
    prisma.groupMember.count.mockResolvedValue(0);
    prisma.deadlineCompletion.count.mockResolvedValue(0);

    await expect(service.forDeadline(deadline)).resolves.toEqual({
      total: 0,
      completed: 0,
      percent: 0,
    });
  });
});
