'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  refreshSession,
  setAccessToken,
  setSessionHandlers,
  unwrap,
  type AuthResponseDto,
  type UserDto,
} from '@/lib/api/client';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: UserDto | null;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<UserDto | null>(null);

  const startSession = useCallback((session: AuthResponseDto) => {
    setAccessToken(session.accessToken);
    setUserState(session.user);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(() => {
    setAccessToken(null);
    setUserState(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionHandlers({
      onSession: (sessionUser) => setUserState(sessionUser),
      onExpired: () => {
        endSession();
        router.replace('/login');
      },
    });
    void refreshSession().then((session) => (session ? startSession(session) : endSession()));
  }, [endSession, router, startSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => {
        startSession(await unwrap(api.POST('/api/auth/login', { body: { email, password } })));
      },
      register: async (fullName, email, password) => {
        startSession(
          await unwrap(api.POST('/api/auth/register', { body: { fullName, email, password } })),
        );
      },
      logout: async () => {
        await api.POST('/api/auth/logout').catch(() => undefined);
        endSession();
        router.replace('/login');
      },
      setUser: setUserState,
    }),
    [endSession, router, startSession, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
