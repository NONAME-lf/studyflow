'use client';

import type { DeadlineDto } from '@/lib/api/client';
import { dayHeading, dayKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { DeadlineRow } from './deadline-row';

/** Deadlines grouped by day on a notebook page (the red margin line holds the times). */
export function DeadlineAgenda({
  deadlines,
  onOpen,
  onEdit,
  showGroup,
  heading,
  className,
}: {
  deadlines: DeadlineDto[];
  onOpen?: (deadline: DeadlineDto) => void;
  onEdit?: (deadline: DeadlineDto) => void;
  showGroup?: boolean;
  heading?: (date: Date) => string;
  className?: string;
}) {
  const days = new Map<string, DeadlineDto[]>();
  for (const d of deadlines) {
    const key = dayKey(new Date(d.dueAt));
    days.set(key, [...(days.get(key) ?? []), d]);
  }

  return (
    <div className={cn('notebook-margin [--margin-x:4rem] sm:[--margin-x:5.5rem]', className)}>
      {[...days.entries()].map(([key, items]) => (
        <section key={key} data-testid="agenda-day" data-day={key}>
          <h3 className="grid grid-cols-[var(--margin-x)_minmax(0,1fr)] pt-6 pb-1">
            <span aria-hidden />
            <span className="pl-4 text-sm font-semibold text-foreground/70">
              {(heading ?? dayHeading)(new Date(items[0].dueAt))}
            </span>
          </h3>
          <ul>
            {items.map((d) => (
              <DeadlineRow
                key={d.id}
                deadline={d}
                onOpen={onOpen}
                onEdit={onEdit}
                showGroup={showGroup}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
