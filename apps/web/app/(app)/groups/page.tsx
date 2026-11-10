'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState, ErrorState, PageHeader, ROLE_LABEL } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { membersLabel } from '@/lib/format';
import { useCreateGroup, useGroups, useJoinGroup } from '@/lib/queries';

const createSchema = z.object({
  name: z.string().trim().min(2, 'Назва має містити від 2 до 50 символів').max(50),
});

function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const create = useCreateGroup();
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    try {
      const group = await create.mutateAsync(name);
      toast.success(`Групу «${group.name}» створено`);
      onOpenChange(false);
      form.reset();
      router.push(`/groups/${group.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося створити групу');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-group-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Нова група</DialogTitle>
          <DialogDescription>
            Ви станете старостою і отримаєте код, за яким одногрупники приєднаються.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="group-name">Назва групи</Label>
            <Input
              id="group-name"
              placeholder="Наприклад, МІ-41"
              data-testid="group-name-input"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-pen-red">{form.formState.errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              data-testid="create-group-submit"
            >
              Створити групу
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinGroupForm() {
  const router = useRouter();
  const join = useJoinGroup();
  const [code, setCode] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    try {
      const group = await join.mutateAsync(code);
      toast.success(`Ви приєдналися до групи «${group.name}»`);
      setCode('');
      router.push(`/groups/${group.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося приєднатися');
    }
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="flex flex-col gap-2 rounded-lg bg-paper-shade p-4 sm:flex-row sm:items-end"
      data-testid="join-group-form"
    >
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="invite-code">Код запрошення від старости</Label>
        <Input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="8 символів, наприклад K7MPQ2XA"
          maxLength={32}
          autoComplete="off"
          className="bg-background font-display tracking-widest uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          data-testid="join-code-input"
        />
      </div>
      <Button type="submit" disabled={join.isPending || !code.trim()} data-testid="join-submit">
        Приєднатися
      </Button>
    </form>
  );
}

export default function GroupsPage() {
  const groups = useGroups();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Групи"
        description="Групи, у яких ви староста або учасник."
        actions={
          <Button onClick={() => setCreating(true)} data-testid="create-group">
            <Plus /> Створити групу
          </Button>
        }
      />
      <JoinGroupForm />

      <div className="mt-8">
        {groups.isPending && <Skeleton className="h-20" />}
        {groups.isError && <ErrorState message={groups.error.message} />}
        {groups.data?.length === 0 && (
          <EmptyState title="Ви ще не в жодній групі">
            Створіть групу, якщо ви староста, або введіть код запрошення, який дав вам староста.
          </EmptyState>
        )}
        {groups.data && groups.data.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {groups.data.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  data-testid="group-card"
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper-shade"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold">{g.name}</p>
                    <p className="text-sm text-muted-foreground">{membersLabel(g.memberCount)}</p>
                  </div>
                  <Badge variant={g.myRole === 'HEADMAN' ? 'default' : 'secondary'}>
                    {ROLE_LABEL[g.myRole]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateGroupDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
