import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { User } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, INVALID_CREDENTIALS } from './auth.service.js';
import { hashToken } from './token-hash.js';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const PASSWORD = 'Secret123!';

const config = new ConfigService({
  JWT_ACCESS_SECRET: ACCESS_SECRET,
  JWT_REFRESH_SECRET: REFRESH_SECRET,
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'artem@studyflow.dev',
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    fullName: 'Мекшаков Артемій',
    refreshTokenHash: null,
    reminderEnabled: true,
    reminderDaysBefore: 1,
    createdAt: new Date('2026-11-10T10:00:00Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  const prisma = mockDeep<PrismaService>();
  const jwt = new JwtService();
  const service = new AuthService(prisma, jwt, config);
  const registerDto = {
    email: 'olena@studyflow.dev',
    password: PASSWORD,
    fullName: 'Коваль Олена',
  };

  beforeEach(() => {
    mockReset(prisma);
  });

  it('UT-01 register stores a bcrypt hash, not the password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(makeUser());

    await service.register(registerDto);

    const { passwordHash } = prisma.user.create.mock.calls[0][0].data;
    expect(passwordHash).not.toBe(PASSWORD);
    expect(passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(bcrypt.compare(PASSWORD, passwordHash)).resolves.toBe(true);
  });

  it('UT-02 duplicate email → ConflictException', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('UT-03 email is normalized to lower case', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(makeUser());

    await service.register({ ...registerDto, email: '  Olena@StudyFlow.DEV ' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'olena@studyflow.dev' },
    });
    expect(prisma.user.create.mock.calls[0][0].data.email).toBe('olena@studyflow.dev');
  });

  it('UT-04 login with valid credentials → access and refresh tokens', async () => {
    const user = makeUser();
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.login({ email: 'ARTEM@studyflow.dev', password: PASSWORD });

    const access = await jwt.verifyAsync<{ sub: string }>(result.accessToken, {
      secret: ACCESS_SECRET,
    });
    const refresh = await jwt.verifyAsync<{ sub: string }>(result.refreshToken, {
      secret: REFRESH_SECRET,
    });
    expect(access.sub).toBe(user.id);
    expect(refresh.sub).toBe(user.id);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(result.refreshToken) },
    });
  });

  it('UT-05 wrong password → UnauthorizedException', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(
      service.login({ email: 'artem@studyflow.dev', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('UT-06 unknown email → the same message as a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@studyflow.dev', password: PASSWORD }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS));

    prisma.user.findUnique.mockResolvedValue(makeUser());
    await expect(
      service.login({ email: 'artem@studyflow.dev', password: 'wrong-password' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS));
  });

  it('UT-07 refresh with an outdated or foreign token → UnauthorizedException', async () => {
    const user = makeUser();
    prisma.user.findUnique.mockResolvedValue(user);
    const { refreshToken: outdated } = await service.login({
      email: user.email,
      password: PASSWORD,
    });

    // The stored hash already belongs to a newer token (rotation happened).
    prisma.user.findUnique.mockResolvedValue({ ...user, refreshTokenHash: hashToken('newer') });
    await expect(service.refresh(outdated)).rejects.toBeInstanceOf(UnauthorizedException);

    const foreign = await jwt.signAsync({ sub: user.id, jti: 'x' }, { secret: 'attacker-secret' });
    await expect(service.refresh(foreign)).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('UT-08 refresh rotates the stored token hash', async () => {
    const user = makeUser();
    prisma.user.findUnique.mockResolvedValue(user);
    const first = await service.login({ email: user.email, password: PASSWORD });

    prisma.user.findUnique.mockResolvedValue({
      ...user,
      refreshTokenHash: hashToken(first.refreshToken),
    });
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(second.refreshToken) },
    });
  });
});
