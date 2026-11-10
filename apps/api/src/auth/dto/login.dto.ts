import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'starosta@studyflow.dev' })
  @IsEmail({}, { message: 'Некоректний email' })
  email: string;

  @ApiProperty({ example: 'Demo1234!' })
  @IsString()
  @MaxLength(72)
  password: string;
}
