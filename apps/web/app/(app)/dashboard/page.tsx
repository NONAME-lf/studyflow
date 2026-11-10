'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, endOfWeek, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState, ErrorState, PageHeader } from '@/components/common';
import { DeadlineAgenda } from '@/components/deadlines/deadline-agenda';
import { DeadlineDetailsDialog } from '@/components/deadlines/deadline-details-dialog';
import { DeadlineFormDialog } from '@/components/deadlines/deadline-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeadlineDto, DeadlineStatus } from '@/lib/api/client';
import { fromInputs, toDateInput, WEEK } from '@/lib/dates';
import { useAllSubjects, useDeadlines, useGroups, useSaveDeadline } from '@/lib/queries';

const ALL = 'all';
const PERSONAL = 'personal';

const quickSchema = z.object({
  title: z.string().trim().min(1, 'Що потрібно зробити?').max(200),
  date: z.string().min(1),
});

function QuickAdd() {
  const save = useSaveDeadline();
  const form = useForm<z.infer<typeof quickSchema>>({
    resolver: zodResolver(quickSchema),
    defaultValues: { title: '', date: toDateInput(addDays(new Date(), 1)) },
  });

  const onSubmit = form.handleSubmit(async ({ title, date }) => {
    try {
      await save.mutateAsync({
        target: { kind: 'personal' },
        body: { title, dueAt: fromInputs(date, '23:59') },
      });
      form.reset({ title: '', date });
      toast.success('Дедлайн додано');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося додати дедлайн');
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-lg bg-paper-shade p-3 sm:flex-row sm:items-center"
      data-testid="quick-add"
    >
      <label htmlFor="quick-title" className="sr-only">
        Новий особистий дедлайн
      </label>
      <Input
        id="quick-title"
        placeholder="Новий особистий дедлайн"
        className="flex-1 bg-background"
        data-testid="quick-add-title"
        {...form.register('title')}
      />
      <label htmlFor="quick-date" className="sr-only">
        Дата
      </label>
      <Input
        id="quick-date"
        type="date"
        className="bg-background sm:w-40"
        data-testid="quick-add-date"
        {...form.register('date')}
      />
      <Button type="submit" disabled={form.formState.isSubmitting} data-testid="quick-add-submit">
        Додати
      </Button>
    </form>
  );
}

export default function DashboardPage() {
  const [group, setGroup] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DeadlineDto | null>(null);
  const [opened, setOpened] = useState<DeadlineDto | null>(null);

  const groups = useGroups();
  const subjects = useAllSubjects();
  const deadlines = useDeadlines({
    groupId: group !== ALL && group !== PERSONAL ? group : undefined,
    subjectId: subject !== ALL ? subject : undefined,
    status: status !== ALL ? (status as DeadlineStatus) : undefined,
  });

  const { overdue, upcoming, weekCount } = useMemo(() => {
    const list = (deadlines.data ?? []).filter((d) => group !== PERSONAL || d.groupId === null);
    const today = startOfDay(new Date());
    const weekEnd = endOfWeek(today, WEEK);
    const showPastDone = status === 'done';
    return {
      overdue: list.filter((d) => d.status === 'overdue'),
      upcoming: list.filter(
        (d) => d.status !== 'overdue' && (showPastDone || new Date(d.dueAt) >= today),
      ),
      weekCount: list.filter((d) => d.status === 'pending' && new Date(d.dueAt) <= weekEnd).length,
    };
  }, [deadlines.data, group, status]);

  const summary = deadlines.data
    ? overdue.length
      ? `До кінця тижня — ${weekCount}, прострочено — ${overdue.length}.`
      : `До кінця тижня — ${weekCount}. Прострочених немає.`
    : 'Особисті дедлайни і дедлайни ваших груп, від найближчого.';

  return (
    <>
      <PageHeader
        title="Мої дедлайни"
        description={summary}
        actions={
          <Button onClick={() => setCreating(true)} data-testid="create-deadline">
            <Plus /> Новий дедлайн
          </Button>
        }
      />

      <QuickAdd />

      <div className="mt-6 flex flex-wrap gap-2" data-testid="deadline-filters">
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Група" data-testid="filter-group">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Усі групи</SelectItem>
            <SelectItem value={PERSONAL}>Лише особисті</SelectItem>
            {groups.data?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger
            className="w-full sm:w-56"
            aria-label="Предмет"
            data-testid="filter-subject"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Усі предмети</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Статус" data-testid="filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Будь-який статус</SelectItem>
            <SelectItem value="pending">Не виконані</SelectItem>
            <SelectItem value="overdue">Прострочені</SelectItem>
            <SelectItem value="done">Виконані</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2">
        {deadlines.isPending && (
          <div className="mt-6 grid gap-3" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}
        {deadlines.isError && (
          <div className="mt-6">
            <ErrorState
              message={deadlines.error.message}
              onRetry={() => void deadlines.refetch()}
            />
          </div>
        )}
        {deadlines.isSuccess && overdue.length === 0 && upcoming.length === 0 && (
          <div className="mt-6">
            <EmptyState title="Дедлайнів немає">
              {group === ALL && subject === ALL && status === ALL
                ? 'Додайте особистий дедлайн або приєднайтеся до групи — її дедлайни з’являться тут.'
                : 'За обраними фільтрами нічого не знайдено.'}
            </EmptyState>
          </div>
        )}
        {overdue.length > 0 && (
          <section className="mt-6" data-testid="overdue-section">
            <h2 className="font-display text-sm font-bold text-pen-red">Прострочені</h2>
            <DeadlineAgenda deadlines={overdue} onOpen={setOpened} onEdit={setEditing} />
          </section>
        )}
        {upcoming.length > 0 && (
          <section className="mt-8" data-testid="upcoming-section">
            <h2 className="font-display text-sm font-bold">Найближчі</h2>
            <DeadlineAgenda deadlines={upcoming} onOpen={setOpened} onEdit={setEditing} />
          </section>
        )}
      </div>

      <DeadlineFormDialog
        open={creating}
        onOpenChange={setCreating}
        target={{ kind: 'personal' }}
      />
      <DeadlineFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        target={
          editing?.groupId ? { kind: 'group', groupId: editing.groupId } : { kind: 'personal' }
        }
        deadline={editing ?? undefined}
      />
      <DeadlineDetailsDialog
        deadline={opened}
        onOpenChange={(open) => !open && setOpened(null)}
        onEdit={(d) => {
          setOpened(null);
          setEditing(d);
        }}
      />
    </>
  );
}
