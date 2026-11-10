import { ApiProperty } from '@nestjs/swagger';
import { type Group, GroupRole } from '../../generated/prisma/client.js';

export type GroupWithCount = Group & { _count: { members: number } };

export class GroupDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'МІ-41' })
  name: string;

  @ApiProperty({
    enum: GroupRole,
    enumName: 'GroupRole',
    description: 'Роль поточного користувача',
  })
  myRole: GroupRole;

  @ApiProperty({ example: 4 })
  memberCount: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'STUDY424',
    description: 'Код запрошення — лише для старости, іншим null',
  })
  inviteCode: string | null;

  @ApiProperty({ example: '2026-11-10T18:00:00.000Z' })
  createdAt: Date;

  static from(group: GroupWithCount, myRole: GroupRole): GroupDto {
    return {
      id: group.id,
      name: group.name,
      myRole,
      memberCount: group._count.members,
      inviteCode: myRole === GroupRole.HEADMAN ? group.inviteCode : null,
      createdAt: group.createdAt,
    };
  }
}
