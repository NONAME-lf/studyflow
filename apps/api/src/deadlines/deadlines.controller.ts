import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { GroupRole } from '../generated/prisma/client.js';
import { GroupAccess } from '../groups/group-access.decorator.js';
import { DeadlinesService } from './deadlines.service.js';
import {
  CreateDeadlineDto,
  DeadlineQueryDto,
  UpdateDeadlineDto,
} from './dto/deadline-requests.dto.js';
import { DeadlineDto, ProgressDto } from './dto/deadline.dto.js';

const NOT_FOUND = { type: ErrorResponseDto, description: 'Дедлайн не знайдено або не видимий' };

@ApiTags('deadlines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
@Controller()
export class DeadlinesController {
  constructor(private readonly deadlines: DeadlinesService) {}

  @Get('deadlines')
  @ApiOperation({
    summary: 'Видимі дедлайни',
    description:
      'Особисті дедлайни користувача й дедлайни його груп, від найближчого. ' +
      'Статус (pending / done / overdue) — для поточного користувача.',
  })
  @ApiOkResponse({ type: [DeadlineDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні фільтри' })
  list(@CurrentUser() user: AuthUser, @Query() query: DeadlineQueryDto): Promise<DeadlineDto[]> {
    return this.deadlines.list(user.id, query);
  }

  @Post('deadlines')
  @ApiOperation({ summary: 'Створити особистий дедлайн', description: 'Бачить лише автор.' })
  @ApiCreatedResponse({ type: DeadlineDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні дані або предмет' })
  createPersonal(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDeadlineDto,
  ): Promise<DeadlineDto> {
    return this.deadlines.createPersonal(user.id, dto);
  }

  @Post('groups/:groupId/deadlines')
  @GroupAccess(GroupRole.HEADMAN)
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({
    summary: 'Створити груповий дедлайн',
    description: 'Лише староста. Дедлайн одразу бачать усі учасники групи.',
  })
  @ApiCreatedResponse({ type: DeadlineDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Невалідні дані або предмет іншої групи',
  })
  createForGroup(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: CreateDeadlineDto,
  ): Promise<DeadlineDto> {
    return this.deadlines.createForGroup(user.id, groupId, dto);
  }

  @Get('deadlines/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Деталі дедлайну' })
  @ApiOkResponse({ type: DeadlineDto })
  @ApiNotFoundResponse(NOT_FOUND)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeadlineDto> {
    return this.deadlines.getOne(user.id, id);
  }

  @Patch('deadlines/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Змінити дедлайн',
    description: 'Особистий — автор, груповий — староста групи.',
  })
  @ApiOkResponse({ type: DeadlineDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні дані або предмет' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Груповий дедлайн, не староста' })
  @ApiNotFoundResponse(NOT_FOUND)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeadlineDto,
  ): Promise<DeadlineDto> {
    return this.deadlines.update(user.id, id, dto);
  }

  @Delete('deadlines/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Видалити дедлайн',
    description: 'Особистий — автор, груповий — староста групи.',
  })
  @ApiNoContentResponse({ description: 'Дедлайн видалено' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Груповий дедлайн, не староста' })
  @ApiNotFoundResponse(NOT_FOUND)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deadlines.remove(user.id, id);
  }

  @Put('deadlines/:id/completion')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Відмітити виконаним',
    description: 'Особиста відмітка поточного користувача. Повторний виклик не змінює стан.',
  })
  @ApiOkResponse({ type: DeadlineDto })
  @ApiNotFoundResponse(NOT_FOUND)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeadlineDto> {
    return this.deadlines.complete(user.id, id);
  }

  @Delete('deadlines/:id/completion')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Зняти відмітку виконання' })
  @ApiOkResponse({ type: DeadlineDto })
  @ApiNotFoundResponse(NOT_FOUND)
  uncomplete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeadlineDto> {
    return this.deadlines.uncomplete(user.id, id);
  }

  @Get('deadlines/:id/progress')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Прогрес групи по дедлайну',
    description: 'Скільки учасників групи відмітили виконання, у відсотках.',
  })
  @ApiOkResponse({ type: ProgressDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Особистий дедлайн' })
  @ApiNotFoundResponse(NOT_FOUND)
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProgressDto> {
    return this.deadlines.getProgress(user.id, id);
  }
}
