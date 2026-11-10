import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type CreateSubjectDto, SubjectDto, type UpdateSubjectDto } from './dto/subject.dto.js';

const DUPLICATE_SUBJECT = 'Предмет з такою назвою в групі вже є';

/** US-10. Access (member / HEADMAN) is enforced by GroupRoleGuard on the controller. */
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId: string): Promise<SubjectDto[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { groupId },
      orderBy: { name: 'asc' },
    });
    return subjects.map((s) => SubjectDto.from(s));
  }

  async create(groupId: string, dto: CreateSubjectDto): Promise<SubjectDto> {
    try {
      const subject = await this.prisma.subject.create({
        data: {
          groupId,
          name: dto.name.trim(),
          teacher: dto.teacher?.trim() || null,
          ...(dto.color && { color: dto.color.toUpperCase() }),
        },
      });
      return SubjectDto.from(subject);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE_SUBJECT);
      throw error;
    }
  }

  async update(groupId: string, subjectId: string, dto: UpdateSubjectDto): Promise<SubjectDto> {
    await this.findOrThrow(groupId, subjectId);
    try {
      const subject = await this.prisma.subject.update({
        where: { id: subjectId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.teacher !== undefined && { teacher: dto.teacher?.trim() || null }),
          ...(dto.color && { color: dto.color.toUpperCase() }),
        },
      });
      return SubjectDto.from(subject);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE_SUBJECT);
      throw error;
    }
  }

  /** Deadlines of the subject stay, their subject becomes empty (onDelete: SetNull). */
  async remove(groupId: string, subjectId: string): Promise<void> {
    await this.findOrThrow(groupId, subjectId);
    await this.prisma.subject.delete({ where: { id: subjectId } });
  }

  private async findOrThrow(groupId: string, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, groupId } });
    if (!subject) throw new NotFoundException('Предмет не знайдено');
  }
}
