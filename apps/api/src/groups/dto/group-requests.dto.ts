import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { GroupRole } from '../../generated/prisma/client.js';

export class CreateGroupDto {
  @ApiProperty({ example: 'МІ-41', minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50, { message: 'Назва групи має містити від 2 до 50 символів' })
  name: string;
}

export class JoinGroupDto {
  @ApiProperty({ example: 'STUDY424', description: 'Код запрошення (регістр не важливий)' })
  @IsString()
  @IsNotEmpty({ message: 'Введіть код запрошення' })
  @MaxLength(32)
  code: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: GroupRole, enumName: 'GroupRole', example: GroupRole.HEADMAN })
  @IsEnum(GroupRole, { message: 'Роль має бути HEADMAN або MEMBER' })
  role: GroupRole;
}

export class InviteCodeDto {
  @ApiProperty({ example: 'K7MPQ2XA' })
  inviteCode: string;
}
