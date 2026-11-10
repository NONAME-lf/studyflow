'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/components/auth/auth-provider';
import { Wordmark } from '@/components/common';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  if (status !== 'authenticated') {
    return (
      <div className="grid min-h-screen place-items-center" aria-busy="true">
        <Wordmark className="animate-pulse text-muted-foreground" />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
