import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module.js';
import { DeadlinesController } from './deadlines.controller.js';
import { DeadlinesService } from './deadlines.service.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [GroupsModule],
  controllers: [DeadlinesController],
  providers: [DeadlinesService, ProgressService],
  exports: [DeadlinesService],
})
export class DeadlinesModule {}
