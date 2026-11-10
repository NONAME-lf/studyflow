import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access-токен (JWT, 15 хв). Передавати в заголовку Authorization: Bearer …',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
  })
  accessToken: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}
