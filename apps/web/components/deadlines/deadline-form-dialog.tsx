'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { addDays } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PRIORITY_LABEL } from '@/components/common';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DeadlineDto } from '@/lib/api/client';
import { fromInputs, toDateInput, toTimeInput } from '@/lib/dates';
import {
  type DeadlineTarget,
  useAllSubjects,
  useGroups,
  useSaveDeadline,
  useSubjects,
} from '@/lib/queries';

const NO_SUBJECT = 'none';

const schema = z.object({
  title: z.string().trim().min(1, 'Вкажіть назву').max(200, 'Не довше 200 символів'),
  description: z.string().max(2000, 'Не довше 2000 символів'),
  date: z.string().min(1, 'Вкажіть дату'),
  time: z.string().min(1, 'Вкажіть час'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  subjectId: z.string(),
});
type Values = z.infer<typeof schema>;

function defaults(deadline?: DeadlineDto): Values {
  if (deadline) {
    const due = new Date(deadline.dueAt);
    return {
      title: deadline.title,
      description: deadline.description ?? '',
      date: toDateInput(due),
      time: toTimeInput(due),
      priority: deadline.priority,
      subjectId: deadline.subject?.id ?? NO_SUBJECT,
    };
  }
  return {
    title: '',
    description: '',
    date: toDateInput(addDays(new Date(), 1)),
    time: '23:59',
    priority: 'MEDIUM',
    subjectId: NO_SUBJECT,
  };
}

export function DeadlineFormDialog({
  open,
  onOpenChange,
  target,
  deadline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DeadlineTarget;
  deadline?: DeadlineDto;
}) {
  const groupId = deadline ? deadline.groupId : target.kind === 'group' ? target.groupId : null;
  const groupSubjects = useSubjects(groupId);
  const mySubjects = useAllSubjects();
  const groups = useGroups();
  const save = useSaveDeadline();

  const subjects = useMemo(() => {
    const list = groupId ? (groupSubjects.data ?? []) : mySubjects;
    const many = !groupId && (groups.data?.length ?? 0) > 1;
    const groupName = new Map(groups.data?.map((g) => [g.id, g.name]));
    return list.map((s) => ({
      id: s.id,
      label: many ? `${s.name} (${groupName.get(s.groupId) ?? ''})` : s.name,
    }));
  }, [groupId, groupSubjects.data, groups.data, mySubjects]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(deadline),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(defaults(deadline));
  }, [deadline, form, open]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: deadline?.id,
        target,
        body: {
          title: values.title,
          description: values.description.trim() || null,
          dueAt: fromInputs(values.date, values.time),
          priority: values.priority,
          subjectId: values.subjectId === NO_SUBJECT ? null : values.subjectId,
        },
      });
      toast.success(deadline ? 'Зміни збережено' : 'Дедлайн додано');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося зберегти дедлайн');
    }
  });

  const isGroup = Boolean(groupId);
  const title = deadline
    ? 'Редагування дедлайну'
    : isGroup
      ? 'Новий груповий дедлайн'
      : 'Новий дедлайн';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="deadline-form">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            {isGroup
              ? 'Дедлайн одразу з’явиться в календарі кожного учасника групи.'
              : 'Особистий дедлайн бачите лише ви.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="deadline-title">Назва</Label>
            <Input
              id="deadline-title"
              placeholder="Наприклад, ЛР 6: графи"
              data-testid="deadline-form-title"
              aria-invalid={Boolean(errors.title)}
              {...form.register('title')}
            />
            {errors.title && <p className="text-sm text-pen-red">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="deadline-date">Дата</Label>
              <Input
                id="deadline-date"
                type="date"
                data-testid="deadline-form-date"
                {...form.register('date')}
              />
              {errors.date && <p className="text-sm text-pen-red">{errors.date.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deadline-time">Час</Label>
              <Input
                id="deadline-time"
                type="time"
                data-testid="deadline-form-time"
                {...form.register('time')}
              />
              {errors.time && <p className="text-sm text-pen-red">{errors.time.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Предмет</Label>
              <Controller
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" data-testid="deadline-form-subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SUBJECT}>Без предмета</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Пріоритет</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" data-testid="deadline-form-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deadline-description">Опис</Label>
            <Textarea
              id="deadline-description"
              rows={3}
              placeholder="Що здати і куди"
              {...form.register('description')}
            />
            {errors.description && (
              <p className="text-sm text-pen-red">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="deadline-form-submit">
              {deadline ? 'Зберегти' : 'Додати дедлайн'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
