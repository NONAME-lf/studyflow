'use client';

import { KanbanSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState, ErrorState, PageHeader } from '@/components/common';
import { DeadlineAgenda } from '@/components/deadlines/deadline-agenda';
import { DeadlineDetailsDialog } from '@/components/deadlines/deadline-details-dialog';
import { DeadlineFormDialog } from '@/components/deadlines/deadline-form-dialog';
import { InviteCodePanel } from '@/components/groups/invite-code-panel';
import { MembersTab } from '@/components/groups/members-tab';
import { SubjectsTab } from '@/components/groups/subjects-tab';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DeadlineDto } from '@/lib/api/client';
import { membersLabel } from '@/lib/format';
import { useDeadlines, useGroup } from '@/lib/queries';

function GroupDeadlines({
  groupId,
  isHeadman,
  onCreate,
}: {
  groupId: string;
  isHeadman: boolean;
  onCreate: () => void;
}) {
  const deadlines = useDeadlines({ groupId });
  const [editing, setEditing] = useState<DeadlineDto | null>(null);
  const [opened, setOpened] = useState<DeadlineDto | null>(null);

  if (deadlines.isPending) return <Skeleton className="h-40" />;
  if (deadlines.isError) return <ErrorState message={deadlines.error.message} />;
  if (deadlines.data.length === 0) {
    return (
      <EmptyState
        title="Дедлайнів групи ще немає"
        action={
          isHeadman && (
            <Button onClick={onCreate}>
              <Plus /> Додати дедлайн
            </Button>
          )
        }
      >
        {isHeadman
          ? 'Додайте дедлайн один раз — він з’явиться в календарі кожного учасника.'
          : 'Коли староста додасть дедлайн, він з’явиться тут і у вашому календарі.'}
      </EmptyState>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Клітинки праворуч — учасники групи: зафарбована означає, що хтось уже відмітив виконання.
      </p>
      <DeadlineAgenda
        deadlines={deadlines.data}
        showGroup={false}
        onOpen={setOpened}
        onEdit={isHeadman ? setEditing : undefined}
      />
      <DeadlineFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        target={{ kind: 'group', groupId }}
        deadline={editing ?? undefined}
      />
      <DeadlineDetailsDialog
        deadline={opened}
        onOpenChange={(open) => !open && setOpened(null)}
        onEdit={
          isHeadman
            ? (d) => {
                setOpened(null);
                setEditing(d);
              }
            : undefined
        }
      />
    </>
  );
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useGroup(groupId);
  const [creating, setCreating] = useState(false);

  if (group.isPending) return <Skeleton className="h-24" />;
  if (group.isError) {
    return (
      <ErrorState
        message={
          group.error.message.includes('учасником')
            ? 'Ви не є учасником цієї групи. Попросіть у старости код запрошення.'
            : group.error.message
        }
      />
    );
  }

  const g = group.data;
  const isHeadman = g.myRole === 'HEADMAN';

  return (
    <>
      <PageHeader
        title={g.name}
        description={`${isHeadman ? 'Ви — староста' : 'Ви — учасник'}. У групі ${membersLabel(g.memberCount)}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/groups/${g.id}/board`} data-testid="open-board">
                <KanbanSquare /> Дошка задач
              </Link>
            </Button>
            {isHeadman && (
              <Button onClick={() => setCreating(true)} data-testid="create-group-deadline">
                <Plus /> Новий дедлайн
              </Button>
            )}
          </>
        }
      />

      {isHeadman && g.inviteCode && (
        <div className="mb-8">
          <InviteCodePanel groupId={g.id} code={g.inviteCode} />
        </div>
      )}

      <Tabs defaultValue="deadlines">
        <TabsList>
          <TabsTrigger value="deadlines" data-testid="tab-deadlines">
            Дедлайни
          </TabsTrigger>
          <TabsTrigger value="subjects" data-testid="tab-subjects">
            Предмети
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">
            Учасники
          </TabsTrigger>
        </TabsList>
        <TabsContent value="deadlines" className="mt-4">
          <GroupDeadlines groupId={g.id} isHeadman={isHeadman} onCreate={() => setCreating(true)} />
        </TabsContent>
        <TabsContent value="subjects" className="mt-4">
          <SubjectsTab groupId={g.id} isHeadman={isHeadman} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab groupId={g.id} isHeadman={isHeadman} />
        </TabsContent>
      </Tabs>

      <DeadlineFormDialog
        open={creating}
        onOpenChange={setCreating}
        target={{ kind: 'group', groupId: g.id }}
      />
    </>
  );
}
