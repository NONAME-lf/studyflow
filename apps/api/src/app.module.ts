import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module.js';
import { DeadlinesModule } from './deadlines/deadlines.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    SubjectsModule,
    DeadlinesModule,
    TasksModule,
    RemindersModule,
    HealthModule,
  ],
})
export class AppModule {}
