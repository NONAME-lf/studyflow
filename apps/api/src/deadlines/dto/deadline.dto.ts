import { ApiProperty } from '@nestjs/swagger';
import { Priority } from '../../generated/prisma/client.js';
import { DEADLINE_STATUSES, type DeadlineStatus } from '../deadline-status.js';

export class ProgressDto {
  @ApiProperty({ example: 4, description: 'Учасників групи' })
  total: number;

  @ApiProperty({ example: 2, description: 'Із них відмітили виконання' })
  completed: number;

  @ApiProperty({ example: 50, description: 'Ціле число відсотків' })
  percent: number;
}

export class SubjectRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Прикладні алгоритми' })
  name: string;

  @ApiProperty({ example: '#10B981' })
  color: string;
}

export class OwnerRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Петров Богдан' })
  fullName: string;
}

export class DeadlineDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ЛР 5: динамічне програмування' })
  title: string;

  @ApiProperty({ type: String, nullable: true, example: 'Здати звіт і код у Classroom' })
  description: string | null;

  @ApiProperty({ example: '2026-11-15T20:59:00.000Z' })
  dueAt: Date;

  @ApiProperty({ enum: Priority, enumName: 'Priority' })
  priority: Priority;

  @ApiProperty({ type: String, nullable: true, format: 'uuid', description: 'null — особистий' })
  groupId: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'МІ-41' })
  groupName: string | null;

  @ApiProperty({ type: SubjectRefDto, nullable: true })
  subject: SubjectRefDto | null;

  @ApiProperty({ type: OwnerRefDto, description: 'Автор' })
  owner: OwnerRefDto;

  @ApiProperty({
    enum: DEADLINE_STATUSES,
    enumName: 'DeadlineStatus',
    description: 'Статус для поточного користувача',
  })
  status: DeadlineStatus;

  @ApiProperty({ type: Date, nullable: true, description: 'Коли поточний користувач відмітив' })
  completedAt: Date | null;

  @ApiProperty({ type: ProgressDto, nullable: true, description: 'Лише для групових' })
  progress: ProgressDto | null;

  @ApiProperty({ description: 'Чи може поточний користувач змінювати й видаляти' })
  canEdit: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
