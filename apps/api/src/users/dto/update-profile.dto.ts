import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Мекшаков Артемій', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100, { message: "Ім'я має містити від 2 до 100 символів" })
  fullName: string;
}
