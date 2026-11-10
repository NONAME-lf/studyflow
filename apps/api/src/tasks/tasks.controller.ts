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
import type { GroupMember } from '../generated/prisma/client.js';
import { CurrentMembership, GroupAccess } from '../groups/group-access.decorator.js';
import { CreateTaskDto, TaskDto, UpdateTaskDto } from './dto/task.dto.js';
import { TasksService } from './tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('groups/:groupId/tasks')
  @GroupAccess()
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({
    summary: 'Задачі канбану групи',
    description: 'Упорядковані за колонкою (TODO → IN_PROGRESS → DONE) і позицією.',
  })
  @ApiOkResponse({ type: [TaskDto] })
  list(@CurrentMembership() membership: GroupMember): Promise<TaskDto[]> {
    return this.tasks.list(membership);
  }

  @Post('groups/:groupId/tasks')
  @GroupAccess()
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({ summary: 'Створити задачу', description: 'Будь-який учасник групи.' })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Невалідні дані, виконавець не з групи або дедлайн іншої групи',
  })
  create(
    @CurrentMembership() membership: GroupMember,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.create(membership, dto);
  }

  @Patch('tasks/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Змінити задачу або перемістити її',
    description:
      'Будь-який учасник групи. status + position — перетягування між колонками й у колонці.',
  })
  @ApiOkResponse({ type: TaskDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Виконавець не з групи' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Задачу не знайдено' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user.id, id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Видалити задачу', description: 'Автор задачі або староста.' })
  @ApiNoContentResponse({ description: 'Задачу видалено' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Не автор і не староста' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Задачу не знайдено' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasks.remove(user.id, id);
  }
}
