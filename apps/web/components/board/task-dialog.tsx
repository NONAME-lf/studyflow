'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TaskDto, TaskStatus } from '@/lib/api/client';
import {
  useCreateTask,
  useDeadlines,
  useDeleteTask,
  useMembers,
  useUpdateTask,
} from '@/lib/queries';

const NONE = 'none';
export const STATUS_TITLE: Record<TaskStatus, string> = {
  TODO: 'До виконання',
  IN_PROGRESS: 'В роботі',
  DONE: 'Готово',
};

const schema = z.object({
  title: z.string().trim().min(1, 'Вкажіть назву').max(200),
  description: z.string().max(2000),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  assigneeId: z.string(),
  deadlineId: z.string(),
});
type Values = z.infer<typeof schema>;

export function TaskDialog({
  groupId,
  task,
  open,
  onOpenChange,
}: {
  groupId: string;
  task?: TaskDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const members = useMembers(groupId);
  const deadlines = useDeadlines({ groupId });
  const create = useCreateTask(groupId);
  const update = useUpdateTask(groupId);
  const remove = useDeleteTask(groupId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'TODO',
        assigneeId: task?.assignee?.id ?? NONE,
        deadlineId: task?.deadline?.id ?? NONE,
      });
    }
  }, [form, open, task]);

  const close = () => {
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const body = {
      title: values.title,
      description: values.description.trim() || null,
      assigneeId: values.assigneeId === NONE ? null : values.assigneeId,
      deadlineId: values.deadlineId === NONE ? null : values.deadlineId,
    };
    try {
      if (task) {
        await update.mutateAsync({
          id: task.id,
          body: values.status === task.status ? body : { ...body, status: values.status },
        });
        toast.success('Задачу збережено');
      } else {
        await create.mutateAsync({ ...body, status: values.status });
        toast.success('Задачу додано');
      }
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти задачу');
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-lg" data-testid="task-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{task ? 'Задача' : 'Нова задача'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Назва</Label>
            <Input id="task-title" data-testid="task-title-input" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-sm text-pen-red">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Виконавець</Label>
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" data-testid="task-assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Без виконавця</SelectItem>
                      {members.data?.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Колонка</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_TITLE) as TaskStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_TITLE[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Дедлайн</Label>
            <Controller
              control={form.control}
              name="deadlineId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Без дедлайну</SelectItem>
                    {deadlines.data?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="task-description">Опис</Label>
            <Textarea id="task-description" rows={3} {...form.register('description')} />
          </div>
          <DialogFooter className="sm:justify-between">
            {task?.canDelete ? (
              confirmDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    remove.mutate(task.id, {
                      onSuccess: () => {
                        toast.success('Задачу видалено');
                        close();
                      },
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  Так, видалити задачу
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-pen-red"
                  onClick={() => setConfirmDelete(true)}
                >
                  Видалити
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Скасувати
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                data-testid="task-submit"
              >
                {task ? 'Зберегти' : 'Додати задачу'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
