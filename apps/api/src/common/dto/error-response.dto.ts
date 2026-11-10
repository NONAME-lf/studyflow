import { ApiProperty } from '@nestjs/swagger';

/** Standard NestJS error body, documented for Swagger. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Пароль має містити щонайменше 8 символів',
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
