'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const email = z.email('Введіть коректний email');

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введіть пароль'),
});

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ім'я має містити щонайменше 2 символи").max(100),
    email,
    password: z.string().min(8, 'Пароль має містити щонайменше 8 символів').max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Паролі не збігаються',
  });

type Mode = 'login' | 'register';
type Values = z.infer<typeof registerSchema>;

function Field({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={Boolean(error)} {...input} />
      {error && <p className="text-sm text-pen-red">{error}</p>}
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register: signUp } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [serverError, setServerError] = useState<string | null>(null);
  const isLogin = mode === 'login';

  const form = useForm<Values>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema) as never,
    defaultValues: { fullName: '', email: '', password: '', confirm: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isLogin) await login(values.email, values.password);
      else await signUp(values.fullName, values.email, values.password);
      router.replace(next?.startsWith('/') ? next : '/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Не вдалося увійти');
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate data-testid={`${mode}-form`}>
      <div>
        <h1 className="font-display text-2xl font-bold">{isLogin ? 'Вхід' : 'Реєстрація'}</h1>
        <p className="mt-2 text-muted-foreground">
          {isLogin
            ? 'Увійдіть, щоб побачити дедлайни своїх груп.'
            : 'Створіть акаунт, щоб вести дедлайни разом із групою.'}
        </p>
      </div>

      {!isLogin && (
        <Field
          id="fullName"
          label="Ім'я та прізвище"
          autoComplete="name"
          data-testid="register-name"
          error={errors.fullName?.message}
          {...form.register('fullName')}
        />
      )}
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        data-testid={`${mode}-email`}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <Field
        id="password"
        label="Пароль"
        type="password"
        autoComplete={isLogin ? 'current-password' : 'new-password'}
        data-testid={`${mode}-password`}
        error={errors.password?.message}
        {...form.register('password')}
      />
      {!isLogin && (
        <Field
          id="confirm"
          label="Повторіть пароль"
          type="password"
          autoComplete="new-password"
          data-testid="register-confirm"
          error={errors.confirm?.message}
          {...form.register('confirm')}
        />
      )}

      {serverError && (
        <p
          className="rounded-md bg-pen-red-soft px-3 py-2 text-sm text-pen-red"
          role="alert"
          data-testid="auth-error"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} data-testid={`${mode}-submit`}>
        {isLogin ? 'Увійти' : 'Створити акаунт'}
      </Button>

      <p className="text-sm text-muted-foreground">
        {isLogin ? 'Ще немає акаунта? ' : 'Уже є акаунт? '}
        <Link
          href={isLogin ? '/register' : '/login'}
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          {isLogin ? 'Зареєструватися' : 'Увійти'}
        </Link>
      </p>
    </form>
  );
}
