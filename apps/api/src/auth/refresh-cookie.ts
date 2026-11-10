import type { CookieOptions } from 'express';

export const REFRESH_COOKIE = 'refresh_token';

/**
 * httpOnly: JS cannot read it. Path "/" so the Next.js middleware can see that a session exists.
 * sameSite=lax: not sent with cross-site POST requests.
 */
export function refreshCookieOptions(expires?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}
