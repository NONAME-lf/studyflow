import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { DevOnlyGuard, DevRemindersController } from './dev-reminders.controller.js';
import { RemindersScheduler } from './reminders.scheduler.js';
import { RemindersService } from './reminders.service.js';

@Module({
  imports: [MailModule],
  controllers: [DevRemindersController],
  providers: [RemindersService, RemindersScheduler, DevOnlyGuard],
})
export class RemindersModule {}
