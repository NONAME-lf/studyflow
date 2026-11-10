import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RemindersService } from './reminders.service.js';

/** R4: cron expression from REMINDER_CRON (hourly by default); "off" and NODE_ENV=test disable it. */
@Injectable()
export class RemindersScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly reminders: RemindersService,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const cronTime = this.config.get<string>('REMINDER_CRON', '0 * * * *');
    if (cronTime === 'off' || this.config.get<string>('NODE_ENV') === 'test') return;

    const job = CronJob.from({
      cronTime,
      onTick: () => void this.tick(),
      start: true,
    });
    this.registry.addCronJob('deadline-reminders', job);
    this.logger.log(`Deadline reminders scheduled: "${cronTime}"`);
  }

  private async tick(): Promise<void> {
    const { sent, failed } = await this.reminders.run();
    this.logger.log(`Reminders sent: ${sent}, failed: ${failed}`);
  }
}
