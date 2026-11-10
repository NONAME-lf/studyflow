'use client';

import { CalendarDays, ListChecks, LogOut, Menu, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Wordmark } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Мої дедлайни', icon: ListChecks, testId: 'nav-dashboard' },
  { href: '/calendar', label: 'Календар', icon: CalendarDays, testId: 'nav-calendar' },
  { href: '/groups', label: 'Групи', icon: Users, testId: 'nav-groups' },
  { href: '/profile', label: 'Профіль', icon: UserRound, testId: 'nav-profile' },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, testId }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-testid={testId}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors',
              active
                ? 'bg-ink-soft font-medium text-ink'
                : 'text-foreground/80 hover:bg-ink-soft/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock() {
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" data-testid="current-user">
          {user?.fullName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void logout()}
        aria-label="Вийти"
        data-testid="logout"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-8 border-r bg-sidebar px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-3">
          <Wordmark />
        </Link>
        <NavLinks />
        <div className="mt-auto">
          <UserBlock />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard">
          <Wordmark className="text-base" />
        </Link>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Меню">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-8 bg-sidebar px-4 py-6">
            <SheetTitle className="px-3">
              <Wordmark />
            </SheetTitle>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <div className="mt-auto">
              <UserBlock />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
