import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { type GroupMember, GroupRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGroupDto, InviteCodeDto, JoinGroupDto } from './dto/group-requests.dto.js';
import { GroupDto } from './dto/group.dto.js';
import { MemberDto } from './dto/member.dto.js';
import { generateInviteCode, normalizeInviteCode } from './invite-code.js';

export const INVITE_CODE_ATTEMPTS = 5;
export const LAST_HEADMAN = 'У групі має залишитися хоча б один староста';

const withMemberCount = { _count: { select: { members: true } } } as const;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /** US-06. G1 — the creator becomes HEADMAN. */
  async create(userId: string, dto: CreateGroupDto): Promise<GroupDto> {
    const group = await this.withUniqueInviteCode((inviteCode) =>
      this.prisma.group.create({
        data: {
          name: dto.name.trim(),
          inviteCode,
          members: { create: { userId, role: GroupRole.HEADMAN } },
        },
        include: withMemberCount,
      }),
    );
    return GroupDto.from(group, GroupRole.HEADMAN);
  }

  async listMine(userId: string): Promise<GroupDto[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: { group: { include: withMemberCount } },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => GroupDto.from(m.group, m.role));
  }

  async getOne(membership: GroupMember): Promise<GroupDto> {
    const group = await this.prisma.group.findUnique({
      where: { id: membership.groupId },
      include: withMemberCount,
    });
    if (!group) throw new NotFoundException('Групу не знайдено');
    return GroupDto.from(group, membership.role);
  }

  /** US-07. G3 — unknown code → 404, already a member → 409, otherwise MEMBER. */
  async join(userId: string, dto: JoinGroupDto): Promise<GroupDto> {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode: normalizeInviteCode(dto.code) },
      include: withMemberCount,
    });
    if (!group) throw new NotFoundException('Групу з таким кодом не знайдено');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (existing) throw new ConflictException('Ви вже учасник цієї групи');

    try {
      await this.prisma.groupMember.create({
        data: { groupId: group.id, userId, role: GroupRole.MEMBER },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Ви вже учасник цієї групи');
      throw error;
    }
    return GroupDto.from(
      { ...group, _count: { members: group._count.members + 1 } },
      GroupRole.MEMBER,
    );
  }

  /** US-07, G4 (HEADMAN). */
  async regenerateInviteCode(groupId: string): Promise<InviteCodeDto> {
    const group = await this.withUniqueInviteCode((inviteCode) =>
      this.prisma.group.update({ where: { id: groupId }, data: { inviteCode } }),
    );
    return { inviteCode: group.inviteCode };
  }

  /** US-09 */
  async listMembers(groupId: string): Promise<MemberDto[]> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
    return members.map((m) => MemberDto.from(m));
  }

  /** US-08, US-09, G4 (HEADMAN). G5 — the last headman cannot be demoted. */
  async changeRole(groupId: string, userId: string, role: GroupRole): Promise<MemberDto> {
    const target = await this.findMemberOrThrow(groupId, userId);
    if (target.role === GroupRole.HEADMAN && role !== GroupRole.HEADMAN) {
      await this.assertNotLastHeadman(groupId);
    }
    const updated = await this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role },
      include: { user: true },
    });
    return MemberDto.from(updated);
  }

  /**
   * US-09. The headman removes a member (G4) or a member leaves (G6).
   * G5 — the last headman can be neither removed nor leave.
   */
  async removeMember(actor: GroupMember, userId: string): Promise<void> {
    const leaving = actor.userId === userId;
    if (!leaving && actor.role !== GroupRole.HEADMAN) {
      throw new ForbiddenException('Видаляти учасників може лише староста');
    }
    const target = await this.findMemberOrThrow(actor.groupId, userId);
    if (target.role === GroupRole.HEADMAN) await this.assertNotLastHeadman(actor.groupId);

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId: actor.groupId, userId } },
    });
  }

  private async findMemberOrThrow(groupId: string, userId: string): Promise<GroupMember> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('Учасника не знайдено');
    return member;
  }

  private async assertNotLastHeadman(groupId: string): Promise<void> {
    const headmen = await this.prisma.groupMember.count({
      where: { groupId, role: GroupRole.HEADMAN },
    });
    if (headmen <= 1) throw new BadRequestException(LAST_HEADMAN);
  }

  /** G2 — on a code collision (unique violation) a new code is generated. */
  private async withUniqueInviteCode<T>(action: (inviteCode: string) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await action(generateInviteCode());
      } catch (error) {
        if (!isUniqueViolation(error) || attempt >= INVITE_CODE_ATTEMPTS) throw error;
      }
    }
  }
}
