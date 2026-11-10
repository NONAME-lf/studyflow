import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { type MailMessage, MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupSwagger } from '../src/swagger.js';

/** In-memory replacement of SMTP: letters are collected instead of sent. */
export class InMemoryMailService {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

export interface TestContext {
  app: INestApplication<App>;
  http: App;
  prisma: PrismaService;
  mail: InMemoryMailService;
}

export async function createTestApp(): Promise<TestContext> {
  const mail = new InMemoryMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  setupSwagger(app);
  await app.init();
  return { app, http: app.getHttpServer(), prisma: app.get(PrismaService), mail };
}

/** Empties every table. Refuses to touch a database whose name does not end with "_test". */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const [{ name }] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (!name.endsWith('_test')) throw new Error(`Refusing to truncate database "${name}"`);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE reminder_logs, deadline_completions, tasks, deadlines, subjects, ' +
      'group_members, groups, users RESTART IDENTITY CASCADE',
  );
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
  cookies: string[];
}

let counter = 0;

export async function registerUser(http: App, fullName = 'Тестовий Студент'): Promise<TestUser> {
  counter += 1;
  const email = `user${counter}-${Date.now()}@test.dev`;
  const res = await request(http)
    .post('/api/auth/register')
    .send({ email, password: 'Secret123!', fullName })
    .expect(201);
  const body = res.body as { accessToken: string; user: { id: string } };
  return {
    id: body.user.id,
    email,
    token: body.accessToken,
    cookies: setCookies(res),
  };
}

export function setCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'] as string | string[] | undefined;
  return Array.isArray(header) ? header : header ? [header] : [];
}

export const bearer = (user: { token: string }) => ({ Authorization: `Bearer ${user.token}` });

export const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

/** Headman creates a group, the member joins by its invite code. */
export async function groupWithMember(http: App) {
  const headman = await registerUser(http, 'Староста Групи');
  const member = await registerUser(http, 'Учасник Групи');
  const group = await request(http)
    .post('/api/groups')
    .set(bearer(headman))
    .send({ name: 'ТЕСТ-1' })
    .expect(201);
  const { id: groupId, inviteCode } = group.body as { id: string; inviteCode: string };
  await request(http)
    .post('/api/groups/join')
    .set(bearer(member))
    .send({ code: inviteCode })
    .expect(201);
  return { headman, member, groupId, inviteCode };
}
