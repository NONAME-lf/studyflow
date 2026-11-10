import { BadRequestException } from '@nestjs/common';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { type GroupMember, GroupRole, TaskStatus } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { placeInColumn } from './task-order.js';
import { type TaskRow, TasksService } from './tasks.service.js';

const NOW = new Date('2026-11-12T12:00:00Z');
const member: GroupMember = {
  groupId: 'group-1',
  userId: 'user-1',
  role: GroupRole.MEMBER,
  joinedAt: NOW,
};

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    groupId: 'group-1',
    title: 'Календар тижня',
    description: null,
    status: TaskStatus.TODO,
    position: 0,
    assigneeId: null,
    deadlineId: null,
    createdById: 'user-1',
    createdAt: NOW,
    updatedAt: NOW,
    assignee: null,
    deadline: null,
    createdBy: { id: 'user-1', fullName: 'Мекшаков Артемій' },
    ...overrides,
  };
}

describe('TasksService', () => {
  const prisma = mockDeep<PrismaService>();
  const service = new TasksService(prisma);

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-29 assignee outside the group → BadRequestException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      service.create(member, { title: 'Слайди демо', assigneeId: 'stranger' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('UT-30 moving a task changes its status and renumbers both columns', async () => {
    prisma.task.findUnique.mockResolvedValue(makeTask({ id: 'moving' }));
    prisma.groupMember.findUnique.mockResolvedValue(member);
    prisma.task.findMany
      .mockResolvedValueOnce([{ id: 'done-a' }, { id: 'done-b' }] as never)
      .mockResolvedValueOnce([{ id: 'todo-c' }] as never);
    prisma.$transaction.mockResolvedValue([] as never);

    await service.update('user-1', 'moving', { status: TaskStatus.DONE, position: 1 });

    expect(placeInColumn(['done-a', 'done-b'], 'moving', 1)).toEqual([
      'done-a',
      'moving',
      'done-b',
    ]);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'moving' },
      data: { status: TaskStatus.DONE, position: 1 },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'done-b' },
      data: { position: 2 },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'todo-c' },
      data: { position: 0 },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
