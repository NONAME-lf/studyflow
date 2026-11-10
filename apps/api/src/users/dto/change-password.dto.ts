import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'Demo1234!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecret123!', minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72, { message: 'Пароль має містити від 8 до 72 символів' })
  newPassword: string;
}
