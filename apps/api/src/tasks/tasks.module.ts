import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [GroupsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
