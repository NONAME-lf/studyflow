import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { UserDto } from '../users/dto/user.dto.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthResult, AuthUser } from './auth.types.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { REFRESH_COOKIE, refreshCookieOptions } from './refresh-cookie.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Реєстрація (одразу виконує вхід)',
    description:
      'Email унікальний без урахування регістру; пароль — від 8 символів, у БД зберігається лише bcrypt-хеш. ' +
      'Повертає access-токен і встановлює httpOnly refresh-cookie.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні дані' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Email уже зареєстровано' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(await this.auth.register(dto), res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вхід',
    description: 'Повертає access-токен (15 хв) і встановлює httpOnly refresh-cookie (7 днів).',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Невалідні дані' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Невірний email або пароль' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(await this.auth.login(dto), res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Оновлення токенів',
    description:
      'Обмінює refresh-cookie на нову пару токенів (ротація: старий refresh-токен стає недійсним).',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Немає або недійсний refresh-токен',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const cookies = req.cookies as Record<string, string | undefined>;
    try {
      return this.respond(await this.auth.refresh(cookies[REFRESH_COOKIE]), res);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вихід', description: 'Інвалідовує refresh-токен і видаляє cookie.' })
  @ApiNoContentResponse({ description: 'Сесію завершено' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user.id);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поточний користувач' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Немає access-токена' })
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.users.getById(user.id);
  }

  private respond(result: AuthResult, res: Response): AuthResponseDto {
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt));
    return { accessToken: result.accessToken, user: result.user };
  }
}
