'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState, ErrorState } from '@/components/common';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubjectDto } from '@/lib/api/client';
import { useDeleteSubject, useSaveSubject, useSubjects } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#64748B',
];

const schema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(100),
  teacher: z.string().max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Колір у форматі #RRGGBB'),
});
type Values = z.infer<typeof schema>;

function SubjectDialog({
  groupId,
  subject,
  open,
  onOpenChange,
}: {
  groupId: string;
  subject?: SubjectDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveSubject(groupId);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const color = useWatch({ control: form.control, name: 'color' });

  useEffect(() => {
    if (open) {
      form.reset({
        name: subject?.name ?? '',
        teacher: subject?.teacher ?? '',
        color: subject?.color ?? PALETTE[0],
      });
    }
  }, [form, open, subject]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        subjectId: subject?.id,
        body: { name: values.name, teacher: values.teacher.trim() || null, color: values.color },
      });
      toast.success(subject ? 'Предмет змінено' : 'Предмет додано');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти предмет');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="subject-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">
            {subject ? 'Редагування предмета' : 'Новий предмет'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="subject-name">Назва</Label>
            <Input id="subject-name" data-testid="subject-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-pen-red">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="subject-teacher">Викладач</Label>
            <Input id="subject-teacher" placeholder="Необов’язково" {...form.register('teacher')} />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Колір</legend>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => form.setValue('color', c, { shouldValidate: true })}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 transition',
                    color?.toUpperCase() === c && 'ring-2 ring-ink',
                  )}
                  style={{ background: c }}
                  aria-label={`Колір ${c}`}
                  aria-pressed={color?.toUpperCase() === c}
                />
              ))}
              <Input
                type="color"
                className="h-8 w-12 p-1"
                aria-label="Інший колір"
                {...form.register('color')}
              />
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              data-testid="subject-submit"
            >
              {subject ? 'Зберегти' : 'Додати предмет'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubjectsTab({ groupId, isHeadman }: { groupId: string; isHeadman: boolean }) {
  const subjects = useSubjects(groupId);
  const remove = useDeleteSubject(groupId);
  const [editing, setEditing] = useState<SubjectDto | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<SubjectDto | null>(null);

  if (subjects.isPending) return <Skeleton className="h-32" />;
  if (subjects.isError) return <ErrorState message={subjects.error.message} />;

  return (
    <div className="grid gap-4">
      {isHeadman && (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
            data-testid="add-subject"
          >
            <Plus /> Додати предмет
          </Button>
        </div>
      )}
      {subjects.data.length === 0 ? (
        <EmptyState title="Предметів ще немає">
          {isHeadman
            ? 'Додайте предмети — їхні кольори підсвічуватимуть дедлайни в календарі.'
            : 'Староста ще не додав предметів.'}
        </EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border">
          {subjects.data.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-4 py-3" data-testid="subject-row">
              <span
                className="size-4 shrink-0 rounded-[4px]"
                style={{ background: s.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                {s.teacher && <p className="text-sm text-muted-foreground">{s.teacher}</p>}
              </div>
              {isHeadman && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Редагувати ${s.name}`}
                    onClick={() => {
                      setEditing(s);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Видалити ${s.name}`}
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <SubjectDialog
        groupId={groupId}
        subject={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити предмет «{deleting?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Дедлайни цього предмета залишаться, але вже без предмета.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-pen-red text-white hover:bg-pen-red/90"
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => toast.success('Предмет видалено'),
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
