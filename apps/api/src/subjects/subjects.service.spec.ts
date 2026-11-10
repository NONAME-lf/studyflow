import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SubjectsService } from './subjects.service.js';

describe('SubjectsService', () => {
  const prisma = mockDeep<PrismaService>();
  const service = new SubjectsService(prisma);

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-39 a subject with an existing name in the group → ConflictException', async () => {
    prisma.subject.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: Prisma.prismaVersion.client,
      }),
    );

    await expect(
      service.create('group-1', { name: 'Бази даних', color: '#8b5cf6' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('UT-40 a subject of another group cannot be deleted → NotFoundException', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(service.remove('group-1', 'subject-of-group-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.subject.findFirst).toHaveBeenCalledWith({
      where: { id: 'subject-of-group-2', groupId: 'group-1' },
    });
    expect(prisma.subject.delete).not.toHaveBeenCalled();
  });
});
