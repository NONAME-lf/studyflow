import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { type GroupMember, GroupRole, Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { GroupWithCount } from './dto/group.dto.js';
import { GroupsService } from './groups.service.js';

function makeGroup(overrides: Partial<GroupWithCount> = {}): GroupWithCount {
  return {
    id: 'group-1',
    name: 'МІ-41',
    inviteCode: 'STUDY424',
    createdAt: new Date('2026-11-10T10:00:00Z'),
    _count: { members: 1 },
    ...overrides,
  };
}

function makeMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    groupId: 'group-1',
    userId: 'user-1',
    role: GroupRole.MEMBER,
    joinedAt: new Date('2026-11-10T10:00:00Z'),
    ...overrides,
  };
}

const uniqueViolation = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
  });

describe('GroupsService', () => {
  const prisma = mockDeep<PrismaService>();
  const service = new GroupsService(prisma);

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-10 invite code collision → the code is generated again', async () => {
    prisma.group.create.mockRejectedValueOnce(uniqueViolation()).mockResolvedValueOnce(makeGroup());

    await service.create('user-1', { name: 'МІ-41' });

    expect(prisma.group.create).toHaveBeenCalledTimes(2);
  });

  it('UT-11 group creator becomes HEADMAN', async () => {
    prisma.group.create.mockResolvedValue(makeGroup());

    const group = await service.create('user-1', { name: '  МІ-41 ' });

    expect(prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'МІ-41',
          members: { create: { userId: 'user-1', role: GroupRole.HEADMAN } },
        }) as unknown,
      }),
    );
    expect(group.myRole).toBe(GroupRole.HEADMAN);
    expect(group.inviteCode).toBe('STUDY424');
  });

  it('UT-12 joining by code → MEMBER', async () => {
    prisma.group.findUnique.mockResolvedValue(makeGroup());
    prisma.groupMember.findUnique.mockResolvedValue(null);

    const group = await service.join('user-2', { code: ' study424 ' });

    expect(prisma.group.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inviteCode: 'STUDY424' } }),
    );
    expect(prisma.groupMember.create).toHaveBeenCalledWith({
      data: { groupId: 'group-1', userId: 'user-2', role: GroupRole.MEMBER },
    });
    expect(group.myRole).toBe(GroupRole.MEMBER);
    expect(group.inviteCode).toBeNull();
  });

  it('UT-13 unknown invite code → NotFoundException', async () => {
    prisma.group.findUnique.mockResolvedValue(null);

    await expect(service.join('user-2', { code: 'NOPE2345' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('UT-14 joining the same group twice → ConflictException', async () => {
    prisma.group.findUnique.mockResolvedValue(makeGroup());
    prisma.groupMember.findUnique.mockResolvedValue(makeMember({ userId: 'user-2' }));

    await expect(service.join('user-2', { code: 'STUDY424' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.groupMember.create).not.toHaveBeenCalled();
  });

  it('UT-15 demoting the last headman → BadRequestException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue(makeMember({ role: GroupRole.HEADMAN }));
    prisma.groupMember.count.mockResolvedValue(1);

    await expect(service.changeRole('group-1', 'user-1', GroupRole.MEMBER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.groupMember.update).not.toHaveBeenCalled();
  });

  it('UT-16 the last headman leaving the group → BadRequestException', async () => {
    const headman = makeMember({ role: GroupRole.HEADMAN });
    prisma.groupMember.findUnique.mockResolvedValue(headman);
    prisma.groupMember.count.mockResolvedValue(1);

    await expect(service.removeMember(headman, headman.userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.groupMember.delete).not.toHaveBeenCalled();
  });
});
