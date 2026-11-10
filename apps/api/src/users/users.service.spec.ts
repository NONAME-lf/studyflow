import { BadRequestException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { User } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

const user: User = {
  id: 'user-1',
  email: 'artem@studyflow.dev',
  passwordHash: bcrypt.hashSync('Demo1234!', 4),
  fullName: 'Мекшаков Артемій',
  refreshTokenHash: null,
  reminderEnabled: true,
  reminderDaysBefore: 1,
  createdAt: new Date('2026-11-10T10:00:00Z'),
};

describe('UsersService', () => {
  const prisma = mockDeep<PrismaService>();
  const service = new UsersService(prisma);

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-37 profile update trims the name and returns no password hash', async () => {
    prisma.user.update.mockResolvedValue({ ...user, fullName: 'Мекшаков А.' });

    const result = await service.updateProfile(user.id, { fullName: '  Мекшаков А.  ' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { fullName: 'Мекшаков А.' },
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('UT-38 password change with a wrong current password → BadRequestException', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.changePassword(user.id, { currentPassword: 'wrong', newPassword: 'NewSecret123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
