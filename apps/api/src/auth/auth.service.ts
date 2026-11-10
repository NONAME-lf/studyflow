import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS, hashPassword, verifyPassword } from '../common/password.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserDto } from '../users/dto/user.dto.js';
import type {
  AccessTokenPayload,
  AuthResult,
  AuthUser,
  RefreshTokenPayload,
} from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashToken, tokenMatchesHash } from './token-hash.js';

export const EMAIL_TAKEN = 'Користувач з таким email уже існує';
export const INVALID_CREDENTIALS = 'Невірний email або пароль';
export const INVALID_REFRESH = 'Сесія недійсна або завершилася — увійдіть знову';
export const INVALID_ACCESS = 'Недійсний або прострочений токен доступу';

// Checked when the email is unknown, so both login failures take the same time (A3).
const DUMMY_HASH = bcrypt.hashSync('studyflow-timing-equalizer', BCRYPT_ROUNDS);

/** A1: emails are compared case-insensitively. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type Ttl = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: Ttl;
  private readonly refreshTtl: Ttl;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTtl = config.get<string>('JWT_ACCESS_TTL', '15m') as Ttl;
    this.refreshTtl = config.get<string>('JWT_REFRESH_TTL', '7d') as Ttl;
  }

  /** US-01. A1 — unique email, A2 — only a bcrypt hash is stored. Logs the user in. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(EMAIL_TAKEN);
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          passwordHash: await hashPassword(dto.password),
        },
      });
      return await this.issueTokens(user);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(EMAIL_TAKEN);
      throw error;
    }
  }

  /** US-02. A3 — the same error for an unknown email and a wrong password. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    const passwordOk = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return this.issueTokens(user);
  }

  /** A4 — a valid token whose hash matches the stored one is exchanged for a new pair (rotation). */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException(INVALID_REFRESH);

    const payload = await this.jwt
      .verifyAsync<RefreshTokenPayload>(refreshToken, { secret: this.refreshSecret })
      .catch(() => null);
    if (!payload) throw new UnauthorizedException(INVALID_REFRESH);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshTokenHash || !tokenMatchesHash(refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException(INVALID_REFRESH);
    }
    return this.issueTokens(user);
  }

  /** A4 — logout invalidates the refresh token. */
  async logout(userId: string): Promise<void> {
    await this.prisma.user.updateMany({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const payload = await this.jwt
      .verifyAsync<AccessTokenPayload>(token, { secret: this.accessSecret })
      .catch(() => null);
    if (!payload?.sub) throw new UnauthorizedException(INVALID_ACCESS);
    return { id: payload.sub, email: payload.email };
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: randomUUID() };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, { secret: this.accessSecret, expiresIn: this.accessTtl }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const { exp } = this.jwt.decode<{ exp: number }>(refreshToken);
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: new Date(exp * 1000),
      user: UserDto.from(user),
    };
  }
}
