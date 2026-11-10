import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { type GroupMember, GroupRole } from '../generated/prisma/client.js';
import {
  CreateGroupDto,
  InviteCodeDto,
  JoinGroupDto,
  UpdateMemberRoleDto,
} from './dto/group-requests.dto.js';
import { GroupDto } from './dto/group.dto.js';
import { MemberDto } from './dto/member.dto.js';
import { CurrentMembership, GroupAccess } from './group-access.decorator.js';
import { GroupsService } from './groups.service.js';

@ApiTags('groups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Створити групу', description: 'Творець групи стає старостою.' })
  @ApiCreatedResponse({ type: GroupDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідна назва' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto): Promise<GroupDto> {
    return this.groups.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Мої групи і моя роль в кожній' })
  @ApiOkResponse({ type: [GroupDto] })
  listMine(@CurrentUser() user: AuthUser): Promise<GroupDto[]> {
    return this.groups.listMine(user.id);
  }

  @Post('join')
  @ApiOperation({
    summary: 'Приєднатися за кодом запрошення',
    description: 'Новий учасник отримує роль MEMBER.',
  })
  @ApiCreatedResponse({ type: GroupDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Невідомий код' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Уже учасник групи' })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinGroupDto): Promise<GroupDto> {
    return this.groups.join(user.id, dto);
  }

  @Get(':groupId')
  @GroupAccess()
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({
    summary: 'Деталі групи',
    description: 'Код запрошення бачить лише староста.',
  })
  @ApiOkResponse({ type: GroupDto })
  getOne(@CurrentMembership() membership: GroupMember): Promise<GroupDto> {
    return this.groups.getOne(membership);
  }

  @Post(':groupId/invite-code')
  @HttpCode(HttpStatus.OK)
  @GroupAccess(GroupRole.HEADMAN)
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({ summary: 'Перегенерувати код запрошення', description: 'Лише староста.' })
  @ApiOkResponse({ type: InviteCodeDto })
  regenerateInviteCode(@Param('groupId') groupId: string): Promise<InviteCodeDto> {
    return this.groups.regenerateInviteCode(groupId);
  }

  @Get(':groupId/members')
  @GroupAccess()
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOperation({
    summary: 'Учасники групи',
    description: 'Спершу старости, далі за датою вступу.',
  })
  @ApiOkResponse({ type: [MemberDto] })
  listMembers(@Param('groupId') groupId: string): Promise<MemberDto[]> {
    return this.groups.listMembers(groupId);
  }

  @Patch(':groupId/members/:userId')
  @GroupAccess(GroupRole.HEADMAN)
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOperation({
    summary: 'Змінити роль учасника',
    description:
      'Лише староста. Передача ролі: призначити іншого HEADMAN, потім понизити себе. ' +
      'Останнього старосту понизити не можна.',
  })
  @ApiOkResponse({ type: MemberDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Останній староста' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Учасника не знайдено' })
  changeRole(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberDto> {
    return this.groups.changeRole(groupId, userId, dto.role);
  }

  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @GroupAccess()
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOperation({
    summary: 'Видалити учасника або вийти з групи',
    description:
      'Староста видаляє будь-кого; учасник може видалити лише себе (вийти). ' +
      'Останній староста не може вийти чи бути видаленим.',
  })
  @ApiNoContentResponse({ description: 'Учасника видалено' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Останній староста' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Учасника не знайдено' })
  removeMember(
    @CurrentMembership() membership: GroupMember,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.groups.removeMember(membership, userId);
  }
}
