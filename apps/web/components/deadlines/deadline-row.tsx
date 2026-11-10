'use client';

import { formatDistanceToNowStrict } from 'date-fns';
import { uk } from 'date-fns/locale';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProgressRegister, SubjectMark } from '@/components/common';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DeadlineDto } from '@/lib/api/client';
import { timeOf } from '@/lib/dates';
import { useDeleteDeadline, useToggleCompletion } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function CompletionCheckbox({ deadline }: { deadline: DeadlineDto }) {
  const toggle = useToggleCompletion();
  const done = deadline.status === 'done';
  return (
    <Checkbox
      className="mt-0.5 size-5 rounded-full border-ink/50"
      checked={done}
      onCheckedChange={(checked) =>
        toggle.mutate(
          { id: deadline.id, done: checked === true },
          {
            onError: (error) => toast.error(error.message),
            onSuccess: () => checked === true && toast.success('Відмічено виконаним'),
          },
        )
      }
      aria-label={done ? 'Зняти відмітку виконання' : 'Відмітити виконаним'}
      data-testid="deadline-checkbox"
    />
  );
}

function RowMenu({ deadline, onEdit }: { deadline: DeadlineDto; onEdit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const remove = useDeleteDeadline();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Дії з дедлайном"
            data-testid="deadline-menu"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>Редагувати</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити «{deadline.title}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {deadline.groupId
                ? 'Дедлайн зникне в усіх учасників групи разом із їхніми відмітками.'
                : 'Дедлайн буде видалено остаточно.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-pen-red text-white hover:bg-pen-red/90"
              onClick={() =>
                remove.mutate(deadline.id, {
                  onSuccess: () => toast.success('Дедлайн видалено'),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** One line of the notebook: time in the margin, the entry to the right of the red line. */
export function DeadlineRow({
  deadline,
  onOpen,
  onEdit,
  showGroup = true,
}: {
  deadline: DeadlineDto;
  onOpen?: (deadline: DeadlineDto) => void;
  onEdit?: (deadline: DeadlineDto) => void;
  showGroup?: boolean;
}) {
  const due = new Date(deadline.dueAt);
  const done = deadline.status === 'done';
  const overdue = deadline.status === 'overdue';

  return (
    <li
      className="grid grid-cols-[var(--margin-x)_minmax(0,1fr)]"
      data-testid="deadline-row"
      data-status={deadline.status}
      data-title={deadline.title}
    >
      <time
        dateTime={deadline.dueAt}
        className={cn(
          'pt-3.5 pr-4 text-right text-sm tabular-nums',
          overdue ? 'font-semibold text-pen-red' : 'text-muted-foreground',
        )}
      >
        {timeOf(due)}
      </time>
      <div className="flex items-start gap-3 border-b border-rule py-3 pl-4">
        <CompletionCheckbox deadline={deadline} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen?.(deadline)}
            className={cn(
              'text-left leading-snug font-medium hover:text-ink',
              done && 'text-muted-foreground line-through decoration-ink/50',
            )}
            data-testid="deadline-title"
          >
            {deadline.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {deadline.subject && (
              <SubjectMark name={deadline.subject.name} color={deadline.subject.color} />
            )}
            {showGroup && <span>{deadline.groupName ?? 'Особистий'}</span>}
            {overdue && (
              <span className="font-medium text-pen-red" data-testid="overdue-badge">
                Прострочено на {formatDistanceToNowStrict(due, { locale: uk })}
              </span>
            )}
            {deadline.priority === 'HIGH' && !done && !overdue && (
              <span className="font-medium text-pen-red">Високий пріоритет</span>
            )}
          </div>
        </div>
        {deadline.progress && (
          <ProgressRegister progress={deadline.progress} className="mt-1 hidden sm:flex" />
        )}
        {deadline.canEdit && onEdit && (
          <RowMenu deadline={deadline} onEdit={() => onEdit(deadline)} />
        )}
      </div>
    </li>
  );
}
