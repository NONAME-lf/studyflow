import {
  type CanActivate,
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { RemindersService } from './reminders.service.js';

/** The route exists only in development and tests; in production it answers 404. */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const env = this.config.get<string>('NODE_ENV');
    if (env === 'development' || env === 'test') return true;
    throw new NotFoundException();
  }
}

export class RemindersRunResultDto {
  @ApiProperty({ example: 3, description: 'Надіслано листів' })
  sent: number;

  @ApiProperty({ example: 0, description: 'Помилок надсилання' })
  failed: number;
}

@ApiTags('dev')
@Controller('dev')
export class DevRemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post('reminders/run')
  @Public()
  @UseGuards(DevOnlyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запустити розсилку нагадувань зараз',
    description:
      'Для демо: те саме, що робить cron. Повторний запуск не надсилає дублікатів. ' +
      'Доступно лише в середовищі розробки.',
  })
  @ApiOkResponse({ type: RemindersRunResultDto })
  @ApiNotFoundResponse({ description: 'У production ендпоінт вимкнений' })
  run(): Promise<RemindersRunResultDto> {
    return this.reminders.run();
  }
}
