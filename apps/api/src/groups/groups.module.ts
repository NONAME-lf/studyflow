import { Module } from '@nestjs/common';
import { GroupRoleGuard } from './group-role.guard.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupRoleGuard],
  exports: [GroupsService, GroupRoleGuard],
})
export class GroupsModule {}
