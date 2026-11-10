import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/** Shared types generated from docs/api/openapi.json (`pnpm openapi:export`). */
type Schemas = components['schemas'];
export type UserDto = Schemas['UserDto'];
export type AuthResponseDto = Schemas['AuthResponseDto'];
export type GroupDto = Schemas['GroupDto'];
export type MemberDto = Schemas['MemberDto'];
export type SubjectDto = Schemas['SubjectDto'];
export type DeadlineDto = Schemas['DeadlineDto'];
export type ProgressDto = Schemas['ProgressDto'];
export type TaskDto = Schemas['TaskDto'];
export type GroupRole = Schemas['GroupDto']['myRole'];
export type Priority = Schemas['DeadlineDto']['priority'];
export type DeadlineStatus = Schemas['DeadlineDto']['status'];
export type TaskStatus = Schemas['TaskDto']['status'];
export type CreateDeadlineBody = Schemas['CreateDeadlineDto'];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'Не вдалося виконати запит. Спробуйте ще раз.';
}

/** Access token lives only in memory; the refresh token is an httpOnly cookie. */
let accessToken: string | null = null;
let refreshing: Promise<AuthResponseDto | null> | null = null;
const handlers: { onSession?: (user: UserDto) => void; onExpired?: () => void } = {};

export function setSessionHandlers(next: typeof handlers): void {
  Object.assign(handlers, next);
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Exchanges the refresh cookie for a new token pair; parallel calls share one request. */
export function refreshSession(): Promise<AuthResponseDto | null> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (res) => {
      if (!res.ok) return null;
      const session = (await res.json()) as AuthResponseDto;
      accessToken = session.accessToken;
      handlers.onSession?.(session.user);
      return session;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function withToken(request: Request): Request {
  if (!accessToken) return request;
  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

/** On 401 refreshes the session once and repeats the request. */
async function authFetch(request: Request): Promise<Response> {
  const retry = request.clone();
  const response = await fetch(withToken(request));
  if (response.status !== 401 || new URL(request.url).pathname.startsWith('/api/auth/')) {
    return response;
  }
  if (!(await refreshSession())) {
    accessToken = null;
    handlers.onExpired?.();
    return response;
  }
  return fetch(withToken(retry));
}

export const api = createClient<paths>({ fetch: authFetch });

/** Returns data of a successful response or throws ApiError with the server message. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (!response.ok) throw new ApiError(response.status, messageOf(error));
  return data as T;
}
