import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import type { GroupMember, GroupRole } from '../generated/prisma/client.js';
import { GROUP_ROLES_KEY, GroupRoleGuard } from './group-role.guard.js';

/** Sets the allowed roles without the guard (for tests and composition). */
export const GroupRoles = (...roles: GroupRole[]) => SetMetadata(GROUP_ROLES_KEY, roles);

/**
 * `@GroupAccess()` — any member of :groupId; `@GroupAccess(GroupRole.HEADMAN)` — headman only.
 */
export function GroupAccess(...roles: GroupRole[]) {
  return applyDecorators(
    GroupRoles(...roles),
    UseGuards(GroupRoleGuard),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description: roles.length ? 'Не учасник групи або не староста' : 'Не учасник групи',
    }),
  );
}

/** Membership of the current user in :groupId (set by GroupRoleGuard). */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GroupMember => {
    const membership = ctx.switchToHttp().getRequest<Request>().groupMembership;
    if (!membership) throw new Error('CurrentMembership used without GroupAccess');
    return membership;
  },
);
