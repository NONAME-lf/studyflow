import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { Priority } from '../../generated/prisma/client.js';
import { DEADLINE_STATUSES, type DeadlineStatus } from '../deadline-status.js';

export class CreateDeadlineDto {
  @ApiProperty({ example: 'ЛР 5: динамічне програмування', maxLength: 200 })
  @IsString()
  @Length(1, 200, { message: 'Назва має містити від 1 до 200 символів' })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-15T20:59:00.000Z' })
  @IsDateString({}, { message: 'Дата має бути у форматі ISO 8601' })
  dueAt: string;

  @ApiPropertyOptional({ enum: Priority, enumName: 'Priority', default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority, { message: 'Пріоритет: LOW, MEDIUM або HIGH' })
  priority?: Priority;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    description:
      'Груповий дедлайн — предмет цієї групи; особистий — предмет будь-якої групи автора',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Некоректний ідентифікатор предмета' })
  subjectId?: string | null;
}

export class UpdateDeadlineDto extends PartialType(CreateDeadlineDto) {}

/** D5: filters of GET /deadlines. */
export class DeadlineQueryDto {
  @ApiPropertyOptional({ format: 'date-time', description: 'dueAt ≥ from' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'dueAt ≤ to' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  groupId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all')
  subjectId?: string;

  @ApiPropertyOptional({ enum: DEADLINE_STATUSES, enumName: 'DeadlineStatus' })
  @IsOptional()
  @IsIn(DEADLINE_STATUSES)
  status?: DeadlineStatus;
}
