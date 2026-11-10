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

interface Deadline {
  id: string;
  title: string;
  status: string;
  progress: { total: number; completed: number; percent: number } | null;
}

describe('Groups and deadlines API (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('IT-05 create a group, a second user joins by the invite code', async () => {
    const { headman, member, groupId } = await groupWithMember(ctx.http);

    const members = await request(ctx.http)
      .get(`/api/groups/${groupId}/members`)
      .set(bearer(member))
      .expect(200);
    expect(members.body).toEqual([
      expect.objectContaining({ userId: headman.id, role: 'HEADMAN' }),
      expect.objectContaining({ userId: member.id, role: 'MEMBER' }),
    ]);

    const memberView = await request(ctx.http)
      .get(`/api/groups/${groupId}`)
      .set(bearer(member))
      .expect(200);
    expect(memberView.body).toMatchObject({ myRole: 'MEMBER', memberCount: 2, inviteCode: null });

    const stranger = await registerUser(ctx.http);
    await request(ctx.http).get(`/api/groups/${groupId}`).set(bearer(stranger)).expect(403);
  });

  it('IT-06 MEMBER cannot create a group deadline → 403', async () => {
    const { member, groupId } = await groupWithMember(ctx.http);

    await request(ctx.http)
      .post(`/api/groups/${groupId}/deadlines`)
      .set(bearer(member))
      .send({ title: 'Спроба учасника', dueAt: inHours(24) })
      .expect(403);
  });

  it("IT-07 the headman's group deadline is visible to a member in GET /deadlines", async () => {
    const { headman, member, groupId } = await groupWithMember(ctx.http);

    const created = await request(ctx.http)
      .post(`/api/groups/${groupId}/deadlines`)
      .set(bearer(headman))
      .send({ title: 'ЛР 5', dueAt: inHours(48), priority: 'HIGH' })
      .expect(201);

    const list = await request(ctx.http).get('/api/deadlines').set(bearer(member)).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({
        id: (created.body as Deadline).id,
        title: 'ЛР 5',
        groupId,
        status: 'pending',
        canEdit: false,
      }),
    ]);
  });

  it('IT-08 completion mark → progress 50 % (2 members, 1 completed)', async () => {
    const { headman, member, groupId } = await groupWithMember(ctx.http);
    const created = await request(ctx.http)
      .post(`/api/groups/${groupId}/deadlines`)
      .set(bearer(headman))
      .send({ title: 'Етап 4', dueAt: inHours(24) })
      .expect(201);
    const id = (created.body as Deadline).id;

    const marked = await request(ctx.http)
      .put(`/api/deadlines/${id}/completion`)
      .set(bearer(member))
      .expect(200);
    expect((marked.body as Deadline).status).toBe('done');

    const progress = await request(ctx.http)
      .get(`/api/deadlines/${id}/progress`)
      .set(bearer(headman))
      .expect(200);
    expect(progress.body).toEqual({ total: 2, completed: 1, percent: 50 });

    // Idempotent: the second mark keeps 50 %.
    await request(ctx.http).put(`/api/deadlines/${id}/completion`).set(bearer(member)).expect(200);
    const again = await request(ctx.http).get(`/api/deadlines/${id}/progress`).set(bearer(headman));
    expect((again.body as { percent: number }).percent).toBe(50);
  });

  it('IT-09 a personal deadline is not visible to another user', async () => {
    const owner = await registerUser(ctx.http);
    const other = await registerUser(ctx.http);
    const created = await request(ctx.http)
      .post('/api/deadlines')
      .set(bearer(owner))
      .send({ title: 'Особисте', dueAt: inHours(24) })
      .expect(201);
    const id = (created.body as Deadline).id;

    const list = await request(ctx.http).get('/api/deadlines').set(bearer(other)).expect(200);
    expect(list.body).toEqual([]);
    await request(ctx.http).get(`/api/deadlines/${id}`).set(bearer(other)).expect(404);
    await request(ctx.http).put(`/api/deadlines/${id}/completion`).set(bearer(other)).expect(404);
  });

  it('IT-10 GET /deadlines filters: from/to and status', async () => {
    const user = await registerUser(ctx.http);
    const create = (title: string, dueAt: string) =>
      request(ctx.http).post('/api/deadlines').set(bearer(user)).send({ title, dueAt }).expect(201);
    await create('Минулий', inHours(-24));
    const tomorrow = await create('Завтра', inHours(24));
    await create('Через 10 днів', inHours(240));
    await request(ctx.http)
      .put(`/api/deadlines/${(tomorrow.body as Deadline).id}/completion`)
      .set(bearer(user))
      .expect(200);

    const titles = async (query: Record<string, string>) => {
      const res = await request(ctx.http)
        .get('/api/deadlines')
        .query(query)
        .set(bearer(user))
        .expect(200);
      return (res.body as Deadline[]).map((d) => d.title);
    };

    expect(await titles({})).toEqual(['Минулий', 'Завтра', 'Через 10 днів']);
    expect(await titles({ from: inHours(12), to: inHours(36) })).toEqual(['Завтра']);
    expect(await titles({ status: 'overdue' })).toEqual(['Минулий']);
    expect(await titles({ status: 'done' })).toEqual(['Завтра']);
    expect(await titles({ status: 'pending' })).toEqual(['Через 10 днів']);
    await request(ctx.http)
      .get('/api/deadlines')
      .query({ status: 'late' })
      .set(bearer(user))
      .expect(400);
  });
});
