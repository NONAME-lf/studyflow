import { type NextRequest, NextResponse } from 'next/server';

const REFRESH_COOKIE = 'refresh_token';
const PROTECTED = ['/dashboard', '/calendar', '/groups', '/profile'];
const GUEST_ONLY = ['/login', '/register'];

/**
 * Optimistic check: no refresh cookie → /login. The real check happens in the API —
 * an invalid cookie fails on /api/auth/refresh, which also deletes it.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/login', request.url));
  }
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  if (hasSession && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/dashboard/:path*',
    '/calendar/:path*',
    '/groups/:path*',
    '/profile/:path*',
  ],
};
