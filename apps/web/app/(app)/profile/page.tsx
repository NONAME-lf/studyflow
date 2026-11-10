'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { PageHeader, ROLE_LABEL } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useChangePassword, useGroups, useUpdateProfile } from '@/lib/queries';

const nameSchema = z.object({
  fullName: z.string().trim().min(2, "Ім'я має містити від 2 до 100 символів").max(100),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введіть поточний пароль'),
    newPassword: z.string().min(8, 'Новий пароль — щонайменше 8 символів').max(72),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Паролі не збігаються',
  });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 md:grid-cols-[14rem_minmax(0,28rem)] md:gap-10">
      <h2 className="font-display text-base font-bold">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const groups = useGroups();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const nameForm = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    values: { fullName: user?.fullName ?? '' },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const saveName = nameForm.handleSubmit(async ({ fullName }) => {
    try {
      setUser(await updateProfile.mutateAsync(fullName));
      toast.success("Ім'я змінено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не вдалося змінити ім'я");
    }
  });

  const savePassword = passwordForm.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      passwordForm.reset();
      toast.success('Пароль змінено');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося змінити пароль');
    }
  });

  const nameError = nameForm.formState.errors.fullName?.message;
  const pErrors = passwordForm.formState.errors;

  return (
    <>
      <PageHeader title="Профіль" description={user?.email} />
      <div className="grid gap-8">
        <Section title="Ім'я">
          <form onSubmit={saveName} className="grid gap-3" noValidate>
            <Label htmlFor="fullName" className="sr-only">
              Ім&apos;я та прізвище
            </Label>
            <Input id="fullName" data-testid="profile-name" {...nameForm.register('fullName')} />
            {nameError && <p className="text-sm text-pen-red">{nameError}</p>}
            <div>
              <Button
                type="submit"
                disabled={nameForm.formState.isSubmitting}
                data-testid="profile-save"
              >
                Зберегти ім&apos;я
              </Button>
            </div>
          </form>
        </Section>

        <Separator />

        <Section title="Пароль">
          <form onSubmit={savePassword} className="grid gap-3" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="currentPassword">Поточний пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('currentPassword')}
              />
              {pErrors.currentPassword && (
                <p className="text-sm text-pen-red">{pErrors.currentPassword.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newPassword">Новий пароль</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('newPassword')}
              />
              {pErrors.newPassword && (
                <p className="text-sm text-pen-red">{pErrors.newPassword.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Повторіть новий пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('confirm')}
              />
              {pErrors.confirm && <p className="text-sm text-pen-red">{pErrors.confirm.message}</p>}
            </div>
            <div>
              <Button
                type="submit"
                variant="outline"
                disabled={passwordForm.formState.isSubmitting}
              >
                Змінити пароль
              </Button>
            </div>
          </form>
        </Section>

        <Separator />

        <Section title="Групи">
          {groups.data?.length ? (
            <ul className="grid gap-2">
              {groups.data.map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="font-medium text-ink hover:underline">
                    {g.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {' '}
                    — {ROLE_LABEL[g.myRole].toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Ви ще не в групі.{' '}
              <Link href="/groups" className="font-medium text-ink hover:underline">
                Приєднатися за кодом
              </Link>
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
