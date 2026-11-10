import request from 'supertest';
import {
  bearer,
  createTestApp,
  groupWithMember,
  inHours,
  registerUser,
  resetDatabase,
  type TestContext,
} from './helpers.js';

interface Task {
  id: string;
  status: string;
  position: number;
  assignee: { id: string } | null;
}

describe('Tasks, reminders and API docs (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mail.sent.length = 0;
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('IT-11 tasks: create, change status, assignee outside the group → 400', async () => {
    const { member, headman, groupId } = await groupWithMember(ctx.http);
    const stranger = await registerUser(ctx.http);

    const created = await request(ctx.http)
      .post(`/api/groups/${groupId}/tasks`)
      .set(bearer(member))
      .send({ title: 'Слайди демо', assigneeId: headman.id })
      .expect(201);
    const task = created.body as Task;
    expect(task).toMatchObject({ status: 'TODO', position: 0, assignee: { id: headman.id } });

    const moved = await request(ctx.http)
      .patch(`/api/tasks/${task.id}`)
      .set(bearer(member))
      .send({ status: 'IN_PROGRESS', position: 0 })
      .expect(200);
    expect(moved.body).toMatchObject({ status: 'IN_PROGRESS', position: 0 });

    await request(ctx.http)
      .post(`/api/groups/${groupId}/tasks`)
      .set(bearer(member))
      .send({ title: 'Чужий виконавець', assigneeId: stranger.id })
      .expect(400);
    await request(ctx.http).get(`/api/groups/${groupId}/tasks`).set(bearer(stranger)).expect(403);
  });

  it('IT-12 POST /dev/reminders/run → one letter per pair, the second run sends nothing', async () => {
    const { headman, groupId } = await groupWithMember(ctx.http);
    await request(ctx.http)
      .post(`/api/groups/${groupId}/deadlines`)
      .set(bearer(headman))
      .send({ title: 'Завтра здача', dueAt: inHours(12) })
      .expect(201);
    await request(ctx.http)
      .post(`/api/groups/${groupId}/deadlines`)
      .set(bearer(headman))
      .send({ title: 'Ще не скоро', dueAt: inHours(24 * 10) })
      .expect(201);

    const first = await request(ctx.http).post('/api/dev/reminders/run').expect(200);
    expect(first.body).toEqual({ sent: 2, failed: 0 });
    expect(ctx.mail.sent).toHaveLength(2);
    expect(ctx.mail.sent[0].subject).toContain('Завтра здача');

    const second = await request(ctx.http).post('/api/dev/reminders/run').expect(200);
    expect(second.body).toEqual({ sent: 0, failed: 0 });
    expect(ctx.mail.sent).toHaveLength(2);
  });

  it('IT-13 GET /api/docs-json → 200 and contains every module tag', async () => {
    const res = await request(ctx.http).get('/api/docs-json').expect(200);
    const doc = res.body as { tags: { name: string }[]; paths: Record<string, unknown> };

    expect(doc.tags.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'auth',
        'users',
        'groups',
        'subjects',
        'deadlines',
        'tasks',
        'dev',
        'health',
      ]),
    );
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/api/auth/login', '/api/deadlines', '/api/groups/{groupId}/tasks']),
    );
  });
});
