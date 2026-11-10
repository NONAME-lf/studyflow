import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { GroupRole, Priority } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { deadlineStatus } from './deadline-status.js';
import { type DeadlineRow, DeadlinesService, visibleTo } from './deadlines.service.js';
import type { ProgressService } from './progress.service.js';

const USER = 'user-1';
const NOW = new Date('2026-11-12T12:00:00Z');

function makeRow(overrides: Partial<DeadlineRow> = {}): DeadlineRow {
  return {
    id: 'deadline-1',
    title: 'ЛР 5',
    description: null,
    dueAt: new Date('2026-11-14T21:59:00Z'),
    priority: Priority.MEDIUM,
    ownerId: USER,
    groupId: null,
    subjectId: null,
    createdAt: NOW,
    updatedAt: NOW,
    subject: null,
    owner: { id: USER, fullName: 'Мекшаков Артемій' },
    group: null,
    completions: [],
    ...overrides,
  };
}

describe('DeadlinesService', () => {
  const prisma = mockDeep<PrismaService>();
  const progress = mockDeep<ProgressService>();
  const service = new DeadlinesService(prisma, progress);
  const dto = { title: 'ЛР 5', dueAt: '2026-11-14T21:59:00.000Z' };

  beforeEach(() => {
    mockReset(prisma);
    mockReset(progress);
    progress.forDeadlines.mockResolvedValue(new Map());
  });

  it('UT-20 personal deadline: owner is the author, groupId = null', async () => {
    prisma.deadline.create.mockResolvedValue(makeRow());

    const deadline = await service.createPersonal(USER, dto);

    expect(prisma.deadline.create.mock.calls[0][0].data).toMatchObject({
      ownerId: USER,
      groupId: null,
      title: 'ЛР 5',
      priority: Priority.MEDIUM,
    });
    expect(deadline.groupId).toBeNull();
    expect(deadline.canEdit).toBe(true);
  });

  it('UT-21 group deadline from a MEMBER → ForbiddenException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue({
      groupId: 'group-1',
      userId: USER,
      role: GroupRole.MEMBER,
      joinedAt: NOW,
    });

    await expect(service.createForGroup(USER, 'group-1', dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.deadline.create).not.toHaveBeenCalled();
  });

  it('UT-22 subject of another group → BadRequestException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue({
      groupId: 'group-1',
      userId: USER,
      role: GroupRole.HEADMAN,
      joinedAt: NOW,
    });
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      groupId: 'group-2',
      name: 'Бази даних',
      teacher: null,
      color: '#8B5CF6',
    });

    await expect(
      service.createForGroup(USER, 'group-1', { ...dto, subjectId: 'subject-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deadline.create).not.toHaveBeenCalled();
  });

  it('UT-23 status for the user: done / overdue / pending', () => {
    const past = new Date('2026-11-10T10:00:00Z');
    const future = new Date('2026-11-20T10:00:00Z');

    expect(deadlineStatus(past, NOW, NOW)).toBe('done');
    expect(deadlineStatus(future, NOW, NOW)).toBe('done');
    expect(deadlineStatus(past, null, NOW)).toBe('overdue');
    expect(deadlineStatus(future, null, NOW)).toBe('pending');
  });

  it('UT-24 list: only visible deadlines, sorted by dueAt', async () => {
    prisma.deadline.findMany.mockResolvedValue([makeRow()]);

    await service.list(USER, {}, NOW);

    expect(visibleTo(USER)).toEqual({
      OR: [{ groupId: null, ownerId: USER }, { group: { members: { some: { userId: USER } } } }],
    });
    const args = prisma.deadline.findMany.mock.calls[0][0];
    expect(args?.where?.AND).toEqual(expect.arrayContaining([visibleTo(USER)]));
    expect(args?.orderBy).toEqual([{ dueAt: 'asc' }, { createdAt: 'asc' }]);
  });

  it('UT-25 marking as done is idempotent', async () => {
    const row = makeRow();
    prisma.deadline.findFirst.mockResolvedValue(row);
    prisma.deadlineCompletion.upsert.mockResolvedValue({
      deadlineId: row.id,
      userId: USER,
      completedAt: NOW,
    });

    await service.complete(USER, row.id);
    await expect(service.complete(USER, row.id)).resolves.toBeDefined();

    expect(prisma.deadlineCompletion.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.deadlineCompletion.upsert).toHaveBeenCalledWith({
      where: { deadlineId_userId: { deadlineId: row.id, userId: USER } },
      create: { deadlineId: row.id, userId: USER },
      update: {},
    });
  });

  it('UT-26 marking an invisible deadline → NotFoundException', async () => {
    prisma.deadline.findFirst.mockResolvedValue(null);

    await expect(service.complete(USER, 'deadline-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.deadlineCompletion.upsert).not.toHaveBeenCalled();
  });
});
