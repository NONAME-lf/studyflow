import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type GroupMember, GroupRole, Prisma, TaskStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTaskDto, TaskDto, UpdateTaskDto } from './dto/task.dto.js';
import { placeInColumn } from './task-order.js';

export const TASK_NOT_FOUND = 'Задачу не знайдено';
export const ASSIGNEE_NOT_MEMBER = 'Виконавець має бути учасником групи';
export const DEADLINE_OF_OTHER_GROUP = 'Дедлайн має належати цій групі';

export const taskInclude = {
  assignee: { select: { id: true, fullName: true } },
  deadline: { select: { id: true, title: true, dueAt: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.TaskInclude;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function toDto(task: TaskRow, membership: GroupMember): TaskDto {
  return {
    id: task.id,
    groupId: task.groupId,
    title: task.title,
    description: task.description,
    status: task.status,
    position: task.position,
    assignee: task.assignee,
    deadline: task.deadline,
    createdBy: task.createdBy,
    canDelete: task.createdById === membership.userId || membership.role === GroupRole.HEADMAN,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

/** US-19, US-20, US-21. K1 — any member creates and moves tasks of the group. */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(membership: GroupMember): Promise<TaskDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: { groupId: membership.groupId },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    });
    return tasks.map((t) => toDto(t, membership));
  }

  /** A new task goes to the end of its column. */
  async create(membership: GroupMember, dto: CreateTaskDto): Promise<TaskDto> {
    const { groupId } = membership;
    await this.assertAssignee(groupId, dto.assigneeId);
    await this.assertDeadline(groupId, dto.deadlineId);

    const status = dto.status ?? TaskStatus.TODO;
    const position = await this.prisma.task.count({ where: { groupId, status } });
    const task = await this.prisma.task.create({
      data: {
        groupId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status,
        position,
        assigneeId: dto.assigneeId ?? null,
        deadlineId: dto.deadlineId ?? null,
        createdById: membership.userId,
      },
      include: taskInclude,
    });
    return toDto(task, membership);
  }

  /** K2 — any status transition (drag-and-drop) and order; K3 — assignee from the group. */
  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDto> {
    const { task, membership } = await this.findForMember(userId, taskId);
    if (dto.assigneeId !== undefined) await this.assertAssignee(task.groupId, dto.assigneeId);
    if (dto.deadlineId !== undefined) await this.assertDeadline(task.groupId, dto.deadlineId);

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.deadlineId !== undefined) data.deadlineId = dto.deadlineId;
    if (Object.keys(data).length > 0) {
      await this.prisma.task.update({ where: { id: taskId }, data });
    }

    const status = dto.status ?? task.status;
    if (status !== task.status || dto.position !== undefined) {
      await this.move(task, status, dto.position);
    }

    const updated = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: taskInclude,
    });
    if (!updated) throw new NotFoundException(TASK_NOT_FOUND);
    return toDto(updated, membership);
  }

  /** K3 — the author or the HEADMAN deletes. */
  async remove(userId: string, taskId: string): Promise<void> {
    const { task, membership } = await this.findForMember(userId, taskId);
    if (task.createdById !== userId && membership.role !== GroupRole.HEADMAN) {
      throw new ForbiddenException('Видалити задачу може автор або староста');
    }
    await this.prisma.task.delete({ where: { id: taskId } });
  }

  /** Renumbers the target column (and the source one when the status changes) in one transaction. */
  private async move(task: TaskRow, status: TaskStatus, position?: number): Promise<void> {
    const order = [
      { position: 'asc' },
      { createdAt: 'asc' },
    ] satisfies Prisma.TaskOrderByWithRelationInput[];
    const target = await this.prisma.task.findMany({
      where: { groupId: task.groupId, status },
      orderBy: order,
      select: { id: true },
    });
    const targetIds = placeInColumn(
      target.map((t) => t.id),
      task.id,
      position ?? target.length,
    );
    const updates = targetIds.map((id, index) =>
      this.prisma.task.update({
        where: { id },
        data: id === task.id ? { status, position: index } : { position: index },
      }),
    );

    if (status !== task.status) {
      const source = await this.prisma.task.findMany({
        where: { groupId: task.groupId, status: task.status, NOT: { id: task.id } },
        orderBy: order,
        select: { id: true },
      });
      updates.push(
        ...source.map((t, index) =>
          this.prisma.task.update({ where: { id: t.id }, data: { position: index } }),
        ),
      );
    }
    await this.prisma.$transaction(updates);
  }

  /** A task of a group the user is not in is reported as missing. */
  private async findForMember(
    userId: string,
    taskId: string,
  ): Promise<{ task: TaskRow; membership: GroupMember }> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    const membership =
      task &&
      (await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: task.groupId, userId } },
      }));
    if (!task || !membership) throw new NotFoundException(TASK_NOT_FOUND);
    return { task, membership };
  }

  private async assertAssignee(groupId: string, assigneeId: string | null | undefined) {
    if (!assigneeId) return;
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!member) throw new BadRequestException(ASSIGNEE_NOT_MEMBER);
  }

  private async assertDeadline(groupId: string, deadlineId: string | null | undefined) {
    if (!deadlineId) return;
    const deadline = await this.prisma.deadline.findFirst({ where: { id: deadlineId, groupId } });
    if (!deadline) throw new BadRequestException(DEADLINE_OF_OTHER_GROUP);
  }
}
