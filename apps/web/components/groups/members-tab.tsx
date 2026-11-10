'use client';

import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';
import { ErrorState, ROLE_LABEL } from '@/components/common';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { MemberDto } from '@/lib/api/client';
import { initials } from '@/lib/format';
import { useChangeRole, useMembers, useRemoveMember } from '@/lib/queries';

export function MembersTab({ groupId, isHeadman }: { groupId: string; isHeadman: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const members = useMembers(groupId);
  const changeRole = useChangeRole(groupId);
  const removeMember = useRemoveMember(groupId);
  const [removing, setRemoving] = useState<MemberDto | null>(null);

  if (members.isPending) return <Skeleton className="h-40" />;
  if (members.isError) return <ErrorState message={members.error.message} />;

  const leaving = removing?.userId === user?.id;

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {members.data.map((m) => {
          const isMe = m.userId === user?.id;
          return (
            <li
              key={m.userId}
              className="flex items-center gap-3 px-4 py-3"
              data-testid="member-row"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-ink-soft text-sm font-medium text-ink">
                  {initials(m.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.fullName}
                  {isMe && <span className="font-normal text-muted-foreground"> (ви)</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {m.email}, у групі з {format(new Date(m.joinedAt), 'd MMMM yyyy', { locale: uk })}
                </p>
              </div>
              <Badge variant={m.role === 'HEADMAN' ? 'default' : 'secondary'}>
                {ROLE_LABEL[m.role]}
              </Badge>
              {(isHeadman || isMe) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Дії: ${m.fullName}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isHeadman && (
                      <DropdownMenuItem
                        onSelect={() =>
                          changeRole.mutate(
                            { userId: m.userId, role: m.role === 'HEADMAN' ? 'MEMBER' : 'HEADMAN' },
                            {
                              onSuccess: () => {
                                toast.success('Роль змінено');
                                void members.refetch();
                              },
                              onError: (error) => toast.error(error.message),
                            },
                          )
                        }
                      >
                        {m.role === 'HEADMAN' ? 'Зробити учасником' : 'Зробити старостою'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(m)}>
                      {isMe ? 'Вийти з групи' : 'Видалити з групи'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {leaving ? 'Вийти з групи?' : `Видалити ${removing?.fullName} з групи?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {leaving
                ? 'Дедлайни групи зникнуть із вашого календаря. Повернутися можна за кодом запрошення.'
                : 'Учасник більше не бачитиме дедлайнів групи.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-pen-red text-white hover:bg-pen-red/90"
              onClick={() =>
                removing &&
                removeMember.mutate(removing.userId, {
                  onSuccess: () => {
                    if (leaving) {
                      toast.success('Ви вийшли з групи');
                      router.push('/groups');
                    } else {
                      toast.success('Учасника видалено');
                      void members.refetch();
                    }
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              {leaving ? 'Вийти' : 'Видалити'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
