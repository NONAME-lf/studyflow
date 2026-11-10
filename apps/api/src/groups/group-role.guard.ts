import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { GroupRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const GROUP_ROLES_KEY = 'groupRoles';
export const NOT_A_MEMBER = 'Ви не є учасником цієї групи';
export const HEADMAN_ONLY = 'Дія доступна лише старості групи';

/**
 * Routes with :groupId. G7 — a non-member gets 403; G4 — @GroupAccess(HEADMAN) limits the action
 * to the headman. The membership is stored in request.groupMembership for the handler.
 */
@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const groupId = request.params.groupId;
    const userId = request.user?.id;
    if (typeof groupId !== 'string' || !userId) throw new ForbiddenException(NOT_A_MEMBER);

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException(NOT_A_MEMBER);

    const roles = this.reflector.getAllAndOverride<GroupRole[] | undefined>(GROUP_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(membership.role)) {
      throw new ForbiddenException(HEADMAN_ONLY);
    }

    request.groupMembership = membership;
    return true;
  }
}
