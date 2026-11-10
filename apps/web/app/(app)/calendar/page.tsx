'use client';

import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrorState, PageHeader } from '@/components/common';
import { DeadlineDetailsDialog } from '@/components/deadlines/deadline-details-dialog';
import { DeadlineFormDialog } from '@/components/deadlines/deadline-form-dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DeadlineDto } from '@/lib/api/client';
import { dayKey, monthGrid, monthTitle, timeOf, WEEK, weekDays, weekTitle } from '@/lib/dates';
import { useDeadlines } from '@/lib/queries';
import { cn } from '@/lib/utils';

type View = 'week' | 'month';

function CalendarChip({
  deadline,
  compact,
  onOpen,
}: {
  deadline: DeadlineDto;
  compact?: boolean;
  onOpen: (deadline: DeadlineDto) => void;
}) {
  const done = deadline.status === 'done';
  const overdue = deadline.status === 'overdue';
  return (
    <button
      type="button"
      onClick={() => onOpen(deadline)}
      data-testid="calendar-deadline"
      data-title={deadline.title}
      data-status={deadline.status}
      className={cn(
        'block w-full rounded-[5px] border-l-[3px] bg-paper-shade text-left transition-colors hover:bg-ink-soft',
        compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1.5 text-sm',
      )}
      style={{ borderLeftColor: deadline.subject?.color ?? 'var(--ink)' }}
      title={`${timeOf(new Date(deadline.dueAt))} ${deadline.title}`}
    >
      {!compact && (
        <span className="block text-xs text-muted-foreground tabular-nums">
          {timeOf(new Date(deadline.dueAt))}
        </span>
      )}
      <span
        className={cn(
          compact ? 'block truncate' : 'line-clamp-2 font-medium',
          done && 'text-muted-foreground line-through',
          overdue && 'text-pen-red',
        )}
      >
        {deadline.title}
      </span>
    </button>
  );
}

function WeekView({
  anchor,
  byDay,
  onOpen,
}: {
  anchor: Date;
  byDay: Map<string, DeadlineDto[]>;
  onOpen: (deadline: DeadlineDto) => void;
}) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-lg border bg-rule md:grid-cols-7"
      data-testid="calendar-week"
    >
      {weekDays(anchor).map((day) => {
        const items = byDay.get(dayKey(day)) ?? [];
        const today = isToday(day);
        return (
          <section
            key={dayKey(day)}
            data-testid={`calendar-day-${dayKey(day)}`}
            className={cn('min-w-0 bg-background p-3 md:min-h-64', today && 'bg-ink-soft/50')}
            aria-label={format(day, 'EEEE, d MMMM', { locale: uk })}
          >
            <header className="mb-3 flex items-baseline gap-2 md:block">
              <span className="text-sm text-muted-foreground capitalize md:block">
                {format(day, 'EEEEEE', { locale: uk })}
              </span>
              <span
                className={cn(
                  'font-display text-2xl font-bold tabular-nums',
                  today ? 'text-ink' : 'text-foreground/80',
                )}
              >
                {format(day, 'd')}
              </span>
            </header>
            {items.length > 0 ? (
              <ul className="grid gap-1.5">
                {items.map((d) => (
                  <li key={d.id}>
                    <CalendarChip deadline={d} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/70 md:hidden">Дедлайнів немає</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MonthView({
  anchor,
  byDay,
  onOpen,
  onShowWeek,
}: {
  anchor: Date;
  byDay: Map<string, DeadlineDto[]>;
  onOpen: (deadline: DeadlineDto) => void;
  onShowWeek: (day: Date) => void;
}) {
  const days = monthGrid(anchor);
  return (
    <div className="overflow-x-auto" data-testid="calendar-month">
      <div className="min-w-[44rem] overflow-hidden rounded-lg border bg-rule">
        <div className="grid grid-cols-7 gap-px">
          {days.slice(0, 7).map((day) => (
            <div
              key={day.toISOString()}
              className="bg-paper-shade px-2 py-1.5 text-xs text-muted-foreground capitalize"
            >
              {format(day, 'EEEEEE', { locale: uk })}
            </div>
          ))}
          {days.map((day) => {
            const items = byDay.get(dayKey(day)) ?? [];
            const inMonth = isSameMonth(day, anchor);
            return (
              <div
                key={dayKey(day)}
                data-testid={`calendar-day-${dayKey(day)}`}
                className={cn(
                  'min-h-28 min-w-0 overflow-hidden bg-background p-1.5',
                  !inMonth && 'bg-paper-shade/60',
                )}
              >
                <span
                  className={cn(
                    'mb-1 inline-grid size-6 place-items-center rounded-full text-xs tabular-nums',
                    isToday(day) && 'bg-ink font-semibold text-white',
                    !inMonth && 'text-muted-foreground/60',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <ul className="grid gap-1">
                  {items.slice(0, 3).map((d) => (
                    <li key={d.id}>
                      <CalendarChip deadline={d} compact onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
                {items.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onShowWeek(day)}
                    className="mt-1 text-xs font-medium text-ink hover:underline"
                  >
                    ще {items.length - 3}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [opened, setOpened] = useState<DeadlineDto | null>(null);
  const [editing, setEditing] = useState<DeadlineDto | null>(null);

  const range = useMemo(
    () =>
      view === 'week'
        ? { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) }
        : {
            from: startOfWeek(startOfMonth(anchor), WEEK),
            to: endOfWeek(endOfMonth(anchor), WEEK),
          },
    [anchor, view],
  );
  const deadlines = useDeadlines({ from: range.from.toISOString(), to: range.to.toISOString() });

  const byDay = useMemo(() => {
    const map = new Map<string, DeadlineDto[]>();
    for (const d of deadlines.data ?? []) {
      const key = dayKey(new Date(d.dueAt));
      map.set(key, [...(map.get(key) ?? []), d]);
    }
    return map;
  }, [deadlines.data]);

  const step = (direction: 1 | -1) =>
    setAnchor((a) => (view === 'week' ? addWeeks(a, direction) : addMonths(a, direction)));

  return (
    <>
      <PageHeader
        title="Календар"
        description="Особисті й групові дедлайни. Колір — предмет."
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            aria-label="Вигляд календаря"
          >
            <ToggleGroupItem value="week" data-testid="view-week">
              Тиждень
            </ToggleGroupItem>
            <ToggleGroupItem value="month" data-testid="view-month">
              Місяць
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Назад">
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            onClick={() => setAnchor(new Date())}
            data-testid="calendar-today"
          >
            Сьогодні
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Вперед">
            <ChevronRight />
          </Button>
        </div>
        <h2 className="font-display text-lg font-bold" data-testid="calendar-title">
          {view === 'week' ? weekTitle(anchor) : monthTitle(anchor)}
        </h2>
      </div>

      {deadlines.isError ? (
        <ErrorState message={deadlines.error.message} onRetry={() => void deadlines.refetch()} />
      ) : view === 'week' ? (
        <WeekView anchor={anchor} byDay={byDay} onOpen={setOpened} />
      ) : (
        <MonthView
          anchor={anchor}
          byDay={byDay}
          onOpen={setOpened}
          onShowWeek={(day) => {
            setAnchor(day);
            setView('week');
          }}
        />
      )}

      <DeadlineDetailsDialog
        deadline={opened}
        onOpenChange={(open) => !open && setOpened(null)}
        onEdit={(d) => {
          setOpened(null);
          setEditing(d);
        }}
      />
      <DeadlineFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        target={
          editing?.groupId ? { kind: 'group', groupId: editing.groupId } : { kind: 'personal' }
        }
        deadline={editing ?? undefined}
      />
    </>
  );
}
