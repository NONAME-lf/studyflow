'use client';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { KanbanBoard } from '@/components/board/kanban-board';
import { TaskDialog } from '@/components/board/task-dialog';
import { ErrorState, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskDto } from '@/lib/api/client';
import { useGroup, useTasks } from '@/lib/queries';

export default function BoardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useGroup(groupId);
  const tasks = useTasks(groupId);
  const [opened, setOpened] = useState<TaskDto | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const error = group.error ?? tasks.error;

  return (
    <>
      <PageHeader
        title="Дошка задач"
        description={
          group.data
            ? `Спільні задачі групи ${group.data.name}. Перетягуйте картки між колонками.`
            : undefined
        }
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href={`/groups/${groupId}`}>
                <ArrowLeft /> До групи
              </Link>
            </Button>
            <Button
              onClick={() => {
                setOpened(undefined);
                setDialogOpen(true);
              }}
              data-testid="create-task"
            >
              <Plus /> Нова задача
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState message={error.message} />
      ) : !tasks.data ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <KanbanBoard
          groupId={groupId}
          tasks={tasks.data}
          onOpen={(task) => {
            setOpened(task);
            setDialogOpen(true);
          }}
        />
      )}

      <TaskDialog groupId={groupId} task={opened} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
