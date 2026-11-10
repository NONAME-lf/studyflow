import request from 'supertest';
import {
  bearer,
  createTestApp,
  registerUser,
  resetDatabase,
  setCookies,
  type TestContext,
} from './helpers.js';

describe('Auth API (integration)', () => {
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

  it('IT-01 register → login → GET /auth/me', async () => {
    const user = await registerUser(ctx.http, 'Коваль Олена');

    const login = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password: 'Secret123!' })
      .expect(200);
    const { accessToken } = login.body as { accessToken: string };
    expect(setCookies(login).join(';')).toMatch(/refresh_token=.+HttpOnly/i);

    const me = await request(ctx.http)
      .get('/api/auth/me')
      .set(bearer({ token: accessToken }))
      .expect(200);
    expect(me.body).toMatchObject({ email: user.email, fullName: 'Коваль Олена' });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('IT-02 refresh through the cookie rotates tokens; logout invalidates the refresh token', async () => {
    const user = await registerUser(ctx.http);

    const refreshed = await request(ctx.http)
      .post('/api/auth/refresh')
      .set('Cookie', user.cookies)
      .expect(200);
    const rotated = setCookies(refreshed);
    expect((refreshed.body as { accessToken: string }).accessToken).toBeTruthy();

    // The old refresh token no longer works after rotation.
    await request(ctx.http).post('/api/auth/refresh').set('Cookie', user.cookies).expect(401);

    const newToken = (refreshed.body as { accessToken: string }).accessToken;
    await request(ctx.http)
      .post('/api/auth/logout')
      .set(bearer({ token: newToken }))
      .expect(204);
    await request(ctx.http).post('/api/auth/refresh').set('Cookie', rotated).expect(401);
  });

  it('IT-03 protected endpoint without a token → 401', async () => {
    await request(ctx.http).get('/api/groups').expect(401);
    await request(ctx.http).get('/api/deadlines').set('Authorization', 'Bearer broken').expect(401);
  });

  it('IT-04 invalid body (email, short password) → 400 with messages', async () => {
    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123', fullName: 'Х' })
      .expect(400);
    const { message } = res.body as { message: string[] };
    expect(message).toEqual(
      expect.arrayContaining([
        'Некоректний email',
        'Пароль має містити від 8 до 72 символів',
        "Ім'я має містити від 2 до 100 символів",
      ]),
    );

    await request(ctx.http)
      .post('/api/auth/register')
      .send({ email: 'a@b.dev', password: 'Secret123!', fullName: 'Хтось', isAdmin: true })
      .expect(400);
  });
});
