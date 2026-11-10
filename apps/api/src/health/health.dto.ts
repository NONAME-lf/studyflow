import { ApiProperty } from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database: 'up' | 'down';

  @ApiProperty({ example: '2026-11-10T18:00:00.000Z' })
  timestamp: string;
}
