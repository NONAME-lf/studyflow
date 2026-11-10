import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupRole, Prisma, Priority } from '../generated/prisma/client.js';
import { HEADMAN_ONLY, NOT_A_MEMBER } from '../groups/group-role.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type DeadlineStatus, deadlineStatus } from './deadline-status.js';
import type {
  CreateDeadlineDto,
  DeadlineQueryDto,
  UpdateDeadlineDto,
} from './dto/deadline-requests.dto.js';
import type { DeadlineDto, ProgressDto } from './dto/deadline.dto.js';
import { ProgressService } from './progress.service.js';

export const DEADLINE_NOT_FOUND = 'Дедлайн не знайдено';
export const SUBJECT_OF_OTHER_GROUP = 'Предмет не належить цій групі';
export const SUBJECT_NOT_IN_MY_GROUPS = 'Предмет має належати одній з ваших груп';

export function deadlineInclude(userId: string) {
  return {
    subject: { select: { id: true, name: true, color: true } },
    owner: { select: { id: true, fullName: true } },
    group: { select: { name: true, members: { where: { userId }, select: { role: true } } } },
    completions: { where: { userId }, select: { completedAt: true } },
  } satisfies Prisma.DeadlineInclude;
}

export type DeadlineRow = Prisma.DeadlineGetPayload<{
  include: ReturnType<typeof deadlineInclude>;
}>;

/** D5: personal deadlines of the user and deadlines of the groups the user belongs to. */
export function visibleTo(userId: string): Prisma.DeadlineWhereInput {
  return {
    OR: [{ groupId: null, ownerId: userId }, { group: { members: { some: { userId } } } }],
  };
}

function statusFilter(
  status: DeadlineStatus,
  userId: string,
  now: Date,
): Prisma.DeadlineWhereInput {
  if (status === 'done') return { completions: { some: { userId } } };
  return {
    completions: { none: { userId } },
    dueAt: status === 'overdue' ? { lt: now } : { gte: now },
  };
}

function toDto(
  row: DeadlineRow,
  userId: string,
  progress: ProgressDto | null,
  now: Date,
): DeadlineDto {
  const completedAt = row.completions[0]?.completedAt ?? null;
  const myGroupRole = row.group?.members[0]?.role;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueAt: row.dueAt,
    priority: row.priority,
    groupId: row.groupId,
    groupName: row.group?.name ?? null,
    subject: row.subject,
    owner: row.owner,
    status: deadlineStatus(row.dueAt, completedAt, now),
    completedAt,
    progress: row.groupId ? progress : null,
    canEdit: row.groupId ? myGroupRole === GroupRole.HEADMAN : row.ownerId === userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class DeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  /** US-13, US-16, US-17. D5: only visible deadlines, filters, sorted by dueAt. */
  async list(userId: string, query: DeadlineQueryDto, now = new Date()): Promise<DeadlineDto[]> {
    const dueAt: Prisma.DateTimeFilter = {};
    if (query.from) dueAt.gte = new Date(query.from);
    if (query.to) dueAt.lte = new Date(query.to);

    const rows = await this.prisma.deadline.findMany({
      where: {
        AND: [
          visibleTo(userId),
          query.groupId ? { groupId: query.groupId } : {},
          query.subjectId ? { subjectId: query.subjectId } : {},
          query.from || query.to ? { dueAt } : {},
          query.status ? statusFilter(query.status, userId, now) : {},
        ],
      },
      include: deadlineInclude(userId),
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
    });

    const progress = await this.progress.forDeadlines(
      rows.flatMap((r) => (r.groupId ? [{ id: r.id, groupId: r.groupId }] : [])),
    );
    return rows.map((row) => toDto(row, userId, progress.get(row.id) ?? null, now));
  }

  async getOne(userId: string, id: string): Promise<DeadlineDto> {
    return this.withProgress(await this.findVisible(userId, id), userId);
  }

  /** US-11. D1: owner — the author, groupId = null. */
  async createPersonal(userId: string, dto: CreateDeadlineDto): Promise<DeadlineDto> {
    await this.assertSubjectAllowed(dto.subjectId, null, userId);
    const row = await this.prisma.deadline.create({
      data: { ...this.fields(dto), ownerId: userId, groupId: null },
      include: deadlineInclude(userId),
    });
    return toDto(row, userId, null, new Date());
  }

  /** US-12. D2: only the HEADMAN of the group; D3: the subject belongs to the group. */
  async createForGroup(
    userId: string,
    groupId: string,
    dto: CreateDeadlineDto,
  ): Promise<DeadlineDto> {
    await this.assertHeadman(groupId, userId);
    await this.assertSubjectAllowed(dto.subjectId, groupId, userId);
    const row = await this.prisma.deadline.create({
      data: { ...this.fields(dto), ownerId: userId, groupId },
      include: deadlineInclude(userId),
    });
    return this.withProgress(row, userId);
  }

  /** D1 / D2: personal — author only, group — HEADMAN only. */
  async update(userId: string, id: string, dto: UpdateDeadlineDto): Promise<DeadlineDto> {
    const row = await this.findVisible(userId, id);
    this.assertCanEdit(row, userId);
    if (dto.subjectId !== undefined) {
      await this.assertSubjectAllowed(dto.subjectId, row.groupId, userId);
    }

    const data: Prisma.DeadlineUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.dueAt !== undefined) data.dueAt = new Date(dto.dueAt);
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.subjectId !== undefined) data.subjectId = dto.subjectId;

    const updated = await this.prisma.deadline.update({
      where: { id },
      data,
      include: deadlineInclude(userId),
    });
    return this.withProgress(updated, userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.findVisible(userId, id);
    this.assertCanEdit(row, userId);
    await this.prisma.deadline.delete({ where: { id } });
  }

  /** US-14. D6: idempotent; an invisible deadline → 404. */
  async complete(userId: string, id: string): Promise<DeadlineDto> {
    await this.findVisible(userId, id);
    await this.prisma.deadlineCompletion.upsert({
      where: { deadlineId_userId: { deadlineId: id, userId } },
      create: { deadlineId: id, userId },
      update: {},
    });
    return this.getOne(userId, id);
  }

  async uncomplete(userId: string, id: string): Promise<DeadlineDto> {
    await this.findVisible(userId, id);
    await this.prisma.deadlineCompletion.deleteMany({ where: { deadlineId: id, userId } });
    return this.getOne(userId, id);
  }

  /** US-27 (D7). */
  async getProgress(userId: string, id: string): Promise<ProgressDto> {
    const row = await this.findVisible(userId, id);
    if (!row.groupId) throw new BadRequestException('Прогрес є лише в групових дедлайнів');
    return this.progress.forDeadline({ id: row.id, groupId: row.groupId });
  }

  private fields(dto: CreateDeadlineDto) {
    return {
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      dueAt: new Date(dto.dueAt),
      priority: dto.priority ?? Priority.MEDIUM,
      subjectId: dto.subjectId ?? null,
    };
  }

  private async findVisible(userId: string, id: string): Promise<DeadlineRow> {
    const row = await this.prisma.deadline.findFirst({
      where: { AND: [{ id }, visibleTo(userId)] },
      include: deadlineInclude(userId),
    });
    if (!row) throw new NotFoundException(DEADLINE_NOT_FOUND);
    return row;
  }

  private async withProgress(row: DeadlineRow, userId: string): Promise<DeadlineDto> {
    const progress = row.groupId
      ? await this.progress.forDeadline({ id: row.id, groupId: row.groupId })
      : null;
    return toDto(row, userId, progress, new Date());
  }

  private assertCanEdit(row: DeadlineRow, userId: string): void {
    if (row.groupId) {
      if (row.group?.members[0]?.role !== GroupRole.HEADMAN) {
        throw new ForbiddenException(HEADMAN_ONLY);
      }
    } else if (row.ownerId !== userId) {
      throw new NotFoundException(DEADLINE_NOT_FOUND);
    }
  }

  private async assertHeadman(groupId: string, userId: string): Promise<void> {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException(NOT_A_MEMBER);
    if (membership.role !== GroupRole.HEADMAN) throw new ForbiddenException(HEADMAN_ONLY);
  }

  /** D3 (US-11): group deadline — subject of that group; personal — of any group of the user. */
  private async assertSubjectAllowed(
    subjectId: string | null | undefined,
    groupId: string | null,
    userId: string,
  ): Promise<void> {
    if (!subjectId) return;
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { groupId: true },
    });

    if (groupId) {
      if (subject?.groupId !== groupId) throw new BadRequestException(SUBJECT_OF_OTHER_GROUP);
      return;
    }
    const membership =
      subject &&
      (await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: subject.groupId, userId } },
      }));
    if (!membership) throw new BadRequestException(SUBJECT_NOT_IN_MY_GROUPS);
  }
}
