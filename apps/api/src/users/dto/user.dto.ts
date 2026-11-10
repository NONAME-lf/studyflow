import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';

export class UserDto {
  @ApiProperty({ format: 'uuid', example: '5eed0000-0000-4000-8000-000000000001' })
  id: string;

  @ApiProperty({ example: 'artem@studyflow.dev' })
  email: string;

  @ApiProperty({ example: 'Мекшаков Артемій' })
  fullName: string;

  @ApiProperty({ example: '2026-11-10T18:00:00.000Z' })
  createdAt: Date;

  static from(user: User): UserDto {
    return { id: user.id, email: user.email, fullName: user.fullName, createdAt: user.createdAt };
  }
}
