'use client';

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { TaskDto, TaskStatus } from '@/lib/api/client';
import { initials } from '@/lib/format';
import { keys, moveTaskLocally, useUpdateTask } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { STATUS_TITLE } from './task-dialog';

type Columns = Record<TaskStatus, string[]>;
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

function toColumns(tasks: TaskDto[]): Columns {
  const columns: Columns = { TODO: [], IN_PROGRESS: [], DONE: [] };
  [...tasks].sort((a, b) => a.position - b.position).forEach((t) => columns[t.status].push(t.id));
  return columns;
}

function TaskCard({ task, dragging }: { task: TaskDto; dragging?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border bg-background p-3 text-left',
        dragging && 'rotate-1 border-ink/40 shadow-lg',
      )}
    >
      <p
        className={cn(
          'text-sm leading-snug font-medium',
          task.status === 'DONE' && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </p>
      {(task.deadline || task.assignee) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {task.deadline ? (
            <span className="truncate text-xs text-muted-foreground" title={task.deadline.title}>
              до {format(new Date(task.deadline.dueAt), 'd MMMM', { locale: uk })}
            </span>
          ) : (
            <span />
          )}
          {task.assignee && (
            <Avatar className="size-6" title={task.assignee.fullName}>
              <AvatarFallback className="bg-ink-soft text-[10px] font-medium text-ink">
                {initials(task.assignee.fullName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}

function SortableTask({ task, onOpen }: { task: TaskDto; onOpen: (task: TaskDto) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('touch-none', isDragging && 'opacity-30')}
      data-testid="task-card"
      data-title={task.title}
      data-status={task.status}
      {...attributes}
      {...listeners}
      aria-roledescription="Задача, яку можна перетягнути"
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        if (event.key === 'Enter') onOpen(task);
      }}
    >
      <TaskCard task={task} />
    </li>
  );
}

function Column({
  status,
  ids,
  byId,
  onOpen,
}: {
  status: TaskStatus;
  ids: string[];
  byId: Map<string, TaskDto>;
  onOpen: (task: TaskDto) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      className="flex min-w-0 flex-col rounded-lg bg-paper-shade"
      data-testid={`kanban-column-${status}`}
      aria-label={STATUS_TITLE[status]}
    >
      <header className="flex items-baseline justify-between px-3 pt-3 pb-2">
        <h2 className="font-display text-sm font-bold">{STATUS_TITLE[status]}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{ids.length}</span>
      </header>
      <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            'flex min-h-40 flex-1 flex-col gap-2 rounded-b-lg px-2 pb-3 transition-colors',
            isOver && 'bg-ink-soft/50',
          )}
        >
          {ids.map((id) => {
            const task = byId.get(id);
            return task ? <SortableTask key={id} task={task} onOpen={onOpen} /> : null;
          })}
        </ul>
      </SortableContext>
    </section>
  );
}

/** US-19, US-21: three columns, drag-and-drop between and inside them. */
export function KanbanBoard({
  groupId,
  tasks,
  onOpen,
}: {
  groupId: string;
  tasks: TaskDto[];
  onOpen: (task: TaskDto) => void;
}) {
  const queryClient = useQueryClient();
  const update = useUpdateTask(groupId);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Column order while a card is being dragged; otherwise the order comes from the query data.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const baseColumns = useMemo(() => toColumns(tasks), [tasks]);
  const columns = dragColumns ?? baseColumns;
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const columnOf = (id: string): TaskStatus | undefined =>
    STATUSES.includes(id as TaskStatus)
      ? (id as TaskStatus)
      : STATUSES.find((s) => columns[s].includes(id));

  const finishDrag = () => {
    setActiveId(null);
    setDragColumns(null);
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragColumns(baseColumns);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = columnOf(String(active.id));
    const to = columnOf(String(over.id));
    if (!from || !to || from === to) return;
    setDragColumns((prev) => {
      const current = prev ?? baseColumns;
      const target = current[to].filter((id) => id !== active.id);
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, String(active.id));
      return { ...current, [from]: current[from].filter((id) => id !== active.id), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const status = columnOf(id);
    const original = byId.get(id);
    if (!over || !status || !original) {
      finishDrag();
      return;
    }

    let ids = columns[status];
    const overId = String(over.id);
    if (ids.includes(overId) && overId !== id) {
      ids = arrayMove(ids, ids.indexOf(id), ids.indexOf(overId));
    }
    const position = ids.indexOf(id);
    if (original.status === status && baseColumns[status].indexOf(id) === position) {
      finishDrag();
      return;
    }

    // Optimistic: the cache gets the new order before the drag state is dropped.
    queryClient.setQueryData<TaskDto[]>(keys.tasks(groupId), (list) =>
      list ? moveTaskLocally(list, id, status, position) : list,
    );
    finishDrag();
    update.mutate(
      { id, body: { status, position } },
      {
        onSuccess: () =>
          original.status !== status &&
          toast.success(`«${original.title}» → ${STATUS_TITLE[status]}`),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finishDrag}
    >
      <div className="grid gap-4 md:grid-cols-3" data-testid="kanban-board">
        {STATUSES.map((status) => (
          <Column key={status} status={status} ids={columns[status]} byId={byId} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>{active ? <TaskCard task={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
