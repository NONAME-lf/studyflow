import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgressDto } from './dto/deadline.dto.js';

/** D7: completed / members of the group, whole percent; an empty group → 0 %. */
export function calculateProgress(completed: number, total: number): ProgressDto {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}

interface GroupDeadlineRef {
  id: string;
  groupId: string;
}

/** US-27. Only completions of current group members are counted. */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async forDeadline(deadline: GroupDeadlineRef): Promise<ProgressDto> {
    const [total, completed] = await Promise.all([
      this.prisma.groupMember.count({ where: { groupId: deadline.groupId } }),
      this.prisma.deadlineCompletion.count({
        where: {
          deadlineId: deadline.id,
          user: { memberships: { some: { groupId: deadline.groupId } } },
        },
      }),
    ]);
    return calculateProgress(completed, total);
  }

  /** Batch version for lists: two queries for any number of deadlines. */
  async forDeadlines(deadlines: GroupDeadlineRef[]): Promise<Map<string, ProgressDto>> {
    const result = new Map<string, ProgressDto>();
    if (deadlines.length === 0) return result;

    const groupIds = [...new Set(deadlines.map((d) => d.groupId))];
    const [members, completions] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { groupId: true, userId: true },
      }),
      this.prisma.deadlineCompletion.findMany({
        where: { deadlineId: { in: deadlines.map((d) => d.id) } },
        select: { deadlineId: true, userId: true },
      }),
    ]);

    const membersByGroup = new Map<string, Set<string>>();
    for (const m of members) {
      const set = membersByGroup.get(m.groupId) ?? new Set<string>();
      set.add(m.userId);
      membersByGroup.set(m.groupId, set);
    }

    for (const d of deadlines) {
      const groupMembers = membersByGroup.get(d.groupId) ?? new Set<string>();
      const completed = completions.filter(
        (c) => c.deadlineId === d.id && groupMembers.has(c.userId),
      ).length;
      result.set(d.id, calculateProgress(completed, groupMembers.size));
    }
    return result;
  }
}
