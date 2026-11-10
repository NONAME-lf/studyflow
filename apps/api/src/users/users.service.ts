import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { hashPassword, verifyPassword } from '../common/password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserDto } from './dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException('Користувача не знайдено');
    return UserDto.from(user);
  }

  /** US-04 */
  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { fullName: dto.fullName.trim() },
    });
    return UserDto.from(user);
  }

  /** US-04: the current password is required. */
  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Невірний поточний пароль');
    }
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
  }
}
