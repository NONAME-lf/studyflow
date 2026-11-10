import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthDto } from './health.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Стан API та підключення до бази даних' })
  @ApiOkResponse({ type: HealthDto, description: 'Сервіс і база даних працюють' })
  @ApiServiceUnavailableResponse({ description: 'База даних недоступна' })
  check(): Promise<HealthDto> {
    return this.health.check();
  }
}
