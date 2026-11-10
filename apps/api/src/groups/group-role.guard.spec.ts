import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { type GroupMember, GroupRole } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { GroupRoles } from './group-access.decorator.js';
import { GroupRoleGuard } from './group-role.guard.js';

const headmanOnlyHandler = () => undefined;
GroupRoles(GroupRole.HEADMAN)(headmanOnlyHandler);
const anyMemberHandler = () => undefined;

function contextFor(handler: () => void, request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Object,
  } as unknown as ExecutionContext;
}

function membership(role: GroupRole): GroupMember {
  return { groupId: 'group-1', userId: 'user-1', role, joinedAt: new Date() };
}

describe('GroupRoleGuard', () => {
  const prisma = mockDeep<PrismaService>();
  const guard = new GroupRoleGuard(new Reflector(), prisma);
  const makeRequest = (): Partial<Request> => ({
    params: { groupId: 'group-1' },
    user: { id: 'user-1', email: 'starosta@studyflow.dev' },
  });

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-17 HEADMAN passes a headman-only route', async () => {
    const headman = membership(GroupRole.HEADMAN);
    prisma.groupMember.findUnique.mockResolvedValue(headman);
    const request = makeRequest();

    await expect(guard.canActivate(contextFor(headmanOnlyHandler, request))).resolves.toBe(true);
    expect(request.groupMembership).toEqual(headman);
  });

  it('UT-18 MEMBER on a headman-only route → ForbiddenException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue(membership(GroupRole.MEMBER));

    await expect(
      guard.canActivate(contextFor(headmanOnlyHandler, makeRequest())),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('UT-19 non-member of the group → ForbiddenException', async () => {
    prisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor(anyMemberHandler, makeRequest())),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
