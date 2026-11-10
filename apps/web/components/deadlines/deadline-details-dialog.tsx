'use client';

import { PRIORITY_LABEL, ProgressRegister, SubjectMark } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DeadlineDto } from '@/lib/api/client';
import { dueLabel } from '@/lib/dates';
import { useToggleCompletion } from '@/lib/queries';
import { cn } from '@/lib/utils';

const STATUS_LABEL = { pending: 'Не виконано', done: 'Виконано', overdue: 'Прострочено' } as const;

export function DeadlineDetailsDialog({
  deadline,
  onOpenChange,
  onEdit,
}: {
  deadline: DeadlineDto | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (deadline: DeadlineDto) => void;
}) {
  const toggle = useToggleCompletion();
  if (!deadline) return null;
  const done = deadline.status === 'done';

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="deadline-details">
        <DialogHeader>
          <DialogTitle className="pr-6 font-display leading-snug">{deadline.title}</DialogTitle>
          <DialogDescription>
            {deadline.groupName
              ? `Груповий дедлайн групи ${deadline.groupName}`
              : 'Особистий дедлайн'}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Термін</dt>
          <dd className="font-medium">{dueLabel(new Date(deadline.dueAt))}</dd>
          <dt className="text-muted-foreground">Статус</dt>
          <dd className={cn(deadline.status === 'overdue' && 'font-medium text-pen-red')}>
            {STATUS_LABEL[deadline.status]}
          </dd>
          {deadline.subject && (
            <>
              <dt className="text-muted-foreground">Предмет</dt>
              <dd>
                <SubjectMark name={deadline.subject.name} color={deadline.subject.color} />
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Пріоритет</dt>
          <dd>{PRIORITY_LABEL[deadline.priority]}</dd>
          {deadline.progress && (
            <>
              <dt className="text-muted-foreground">Виконали</dt>
              <dd>
                <ProgressRegister progress={deadline.progress} />
              </dd>
            </>
          )}
          {deadline.description && (
            <>
              <dt className="text-muted-foreground">Опис</dt>
              <dd className="whitespace-pre-line">{deadline.description}</dd>
            </>
          )}
        </dl>
        <DialogFooter>
          {deadline.canEdit && onEdit && (
            <Button variant="ghost" onClick={() => onEdit(deadline)}>
              Редагувати
            </Button>
          )}
          <Button
            variant={done ? 'outline' : 'default'}
            data-testid="details-toggle"
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate(
                { id: deadline.id, done: !done },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {done ? 'Зняти відмітку' : 'Відмітити виконаним'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
