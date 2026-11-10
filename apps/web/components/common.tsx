import { cn } from '@/lib/utils';
import type { ProgressDto } from '@/lib/api/client';

/** Logo: a register cell with a check — the same mark as completed work in group progress. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 font-display text-lg font-bold', className)}
    >
      <svg viewBox="0 0 20 20" className="size-5 text-ink" aria-hidden>
        <rect x="1" y="1" width="18" height="18" rx="4" fill="currentColor" />
        <path
          d="M5.5 10.5l3 3 6-7"
          stroke="#fff"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      StudyFlow
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Subject name with a highlighter stroke in the subject colour. */
export function SubjectMark({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="rounded-[2px] px-0.5 text-foreground/85"
      style={{ backgroundImage: `linear-gradient(transparent 52%, ${color}59 52%)` }}
    >
      {name}
    </span>
  );
}

/**
 * Group progress as a row of register cells: one cell per member, filled when that many
 * members have marked the deadline done. Large groups fall back to a bar.
 */
export function ProgressRegister({
  progress,
  className,
}: {
  progress: ProgressDto;
  className?: string;
}) {
  const { total, completed, percent } = progress;
  return (
    <div
      className={cn('flex shrink-0 items-center gap-2', className)}
      data-testid="progress"
      title={`Виконали ${completed} з ${total}`}
      aria-label={`Виконали ${completed} з ${total} учасників`}
    >
      {total <= 16 ? (
        <span className="flex gap-[3px]" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'size-3 rounded-[3px] border',
                i < completed ? 'border-ink bg-ink' : 'border-ink/30 bg-background',
              )}
            />
          ))}
        </span>
      ) : (
        <span className="h-2 w-24 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
          <span className="block h-full bg-ink" style={{ width: `${percent}%` }} />
        </span>
      )}
      <span className="w-10 font-display text-xs tabular-nums" data-testid="progress-percent">
        {percent}%
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-dashed px-6 py-10 text-center"
      data-testid="empty-state"
    >
      <p className="font-medium">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-lg border border-pen-red/30 bg-pen-red-soft px-5 py-4 text-sm"
      role="alert"
    >
      <p className="font-medium text-pen-red">Не вдалося завантажити дані</p>
      <p className="mt-1 text-foreground/80">{message}</p>
      {onRetry && (
        <button
          className="mt-2 text-sm font-medium text-ink underline underline-offset-2"
          onClick={onRetry}
        >
          Спробувати ще раз
        </button>
      )}
    </div>
  );
}

export const ROLE_LABEL = { HEADMAN: 'Староста', MEMBER: 'Учасник' } as const;
export const PRIORITY_LABEL = { LOW: 'Низький', MEDIUM: 'Середній', HIGH: 'Високий' } as const;
