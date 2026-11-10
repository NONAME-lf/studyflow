import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskStatus } from '../../generated/prisma/client.js';

export class UserRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Мекшаков Артемій' })
  fullName: string;
}

export class DeadlineRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Етап 4: звіт і демо-презентація' })
  title: string;

  @ApiProperty()
  dueAt: Date;
}

export class TaskDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  groupId: string;

  @ApiProperty({ example: 'Календар тижня' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  status: TaskStatus;

  @ApiProperty({ example: 0, description: 'Порядок у колонці, від 0' })
  position: number;

  @ApiProperty({ type: UserRefDto, nullable: true })
  assignee: UserRefDto | null;

  @ApiProperty({ type: DeadlineRefDto, nullable: true, description: 'Пов’язаний дедлайн' })
  deadline: DeadlineRefDto | null;

  @ApiProperty({ type: UserRefDto })
  createdBy: UserRefDto;

  @ApiProperty({ description: 'Автор задачі або староста' })
  canDelete: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Підготувати слайди демо', maxLength: 200 })
  @IsString()
  @Length(1, 200, { message: 'Назва задачі має містити від 1 до 200 символів' })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: TaskStatus, enumName: 'TaskStatus', default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Статус: TODO, IN_PROGRESS або DONE' })
  status?: TaskStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'Учасник групи',
  })
  @IsOptional()
  @IsUUID('all')
  assigneeId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'Дедлайн групи',
  })
  @IsOptional()
  @IsUUID('all')
  deadlineId?: string | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ example: 0, description: 'Нова позиція в колонці (drag-and-drop)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
