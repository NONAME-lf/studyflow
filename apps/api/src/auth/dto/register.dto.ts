import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@studyflow.dev' })
  @IsEmail({}, { message: 'Некоректний email' })
  email: string;

  /** A2: at least 8 characters; 72 is the bcrypt input limit. */
  @ApiProperty({ example: 'Secret123!', minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72, { message: 'Пароль має містити від 8 до 72 символів' })
  password: string;

  @ApiProperty({ example: 'Коваль Олена', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100, { message: "Ім'я має містити від 2 до 100 символів" })
  fullName: string;
}
