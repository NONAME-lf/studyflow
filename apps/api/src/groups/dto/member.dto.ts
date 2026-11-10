import { ApiProperty } from '@nestjs/swagger';
import { type GroupMember, GroupRole, type User } from '../../generated/prisma/client.js';

export class MemberDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'Мекшаков Артемій' })
  fullName: string;

  @ApiProperty({ example: 'artem@studyflow.dev' })
  email: string;

  @ApiProperty({ enum: GroupRole, enumName: 'GroupRole' })
  role: GroupRole;

  @ApiProperty({ example: '2026-11-10T18:00:00.000Z' })
  joinedAt: Date;

  static from(member: GroupMember & { user: User }): MemberDto {
    return {
      userId: member.userId,
      fullName: member.user.fullName,
      email: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }
}
