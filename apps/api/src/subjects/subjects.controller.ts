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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { GroupRole } from '../generated/prisma/client.js';
import { GroupAccess } from '../groups/group-access.decorator.js';
import { CreateSubjectDto, SubjectDto, UpdateSubjectDto } from './dto/subject.dto.js';
import { SubjectsService } from './subjects.service.js';

@ApiTags('subjects')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
@ApiParam({ name: 'groupId', format: 'uuid' })
@Controller('groups/:groupId/subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  @GroupAccess()
  @ApiOperation({ summary: 'Предмети групи' })
  @ApiOkResponse({ type: [SubjectDto] })
  list(@Param('groupId') groupId: string): Promise<SubjectDto[]> {
    return this.subjects.list(groupId);
  }

  @Post()
  @GroupAccess(GroupRole.HEADMAN)
  @ApiOperation({ summary: 'Додати предмет', description: 'Лише староста.' })
  @ApiCreatedResponse({ type: SubjectDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні дані' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Предмет з такою назвою вже є' })
  create(@Param('groupId') groupId: string, @Body() dto: CreateSubjectDto): Promise<SubjectDto> {
    return this.subjects.create(groupId, dto);
  }

  @Patch(':subjectId')
  @GroupAccess(GroupRole.HEADMAN)
  @ApiParam({ name: 'subjectId', format: 'uuid' })
  @ApiOperation({ summary: 'Змінити предмет', description: 'Лише староста.' })
  @ApiOkResponse({ type: SubjectDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Предмет не знайдено' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Предмет з такою назвою вже є' })
  update(
    @Param('groupId') groupId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectDto> {
    return this.subjects.update(groupId, subjectId, dto);
  }

  @Delete(':subjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @GroupAccess(GroupRole.HEADMAN)
  @ApiParam({ name: 'subjectId', format: 'uuid' })
  @ApiOperation({
    summary: 'Видалити предмет',
    description: 'Лише староста. Дедлайни предмета залишаються без предмета.',
  })
  @ApiNoContentResponse({ description: 'Предмет видалено' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Предмет не знайдено' })
  remove(
    @Param('groupId') groupId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ): Promise<void> {
    return this.subjects.remove(groupId, subjectId);
  }
}
