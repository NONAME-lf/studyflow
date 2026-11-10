import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type { Subject } from '../../generated/prisma/client.js';

export class SubjectDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  groupId: string;

  @ApiProperty({ example: 'Інформаційні технології' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Мокрієв М.' })
  teacher: string | null;

  @ApiProperty({ example: '#3B82F6' })
  color: string;

  static from(subject: Subject): SubjectDto {
    return {
      id: subject.id,
      groupId: subject.groupId,
      name: subject.name,
      teacher: subject.teacher,
      color: subject.color,
    };
  }
}

export class CreateSubjectDto {
  @ApiProperty({ example: 'Бази даних', maxLength: 100 })
  @IsString()
  @Length(1, 100, { message: 'Назва предмета має містити від 1 до 100 символів' })
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Іваненко І. І.', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  teacher?: string | null;

  @ApiPropertyOptional({ example: '#8B5CF6', description: 'Колір у форматі #RRGGBB' })
  @IsOptional()
  @IsHexColor({ message: 'Колір має бути у форматі #RRGGBB' })
  @Length(7, 7, { message: 'Колір має бути у форматі #RRGGBB' })
  color?: string;
}

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}
