'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAdministrator } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import { authenticationErrorMessage } from './auth-errors';
import { loginSchema, type LoginValues } from './auth.schemas';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit(async (values) => {
    try {
      const session = await loginAdministrator(values);
      setAuthenticated(session.admin);
      const destination = safeAdminDestination(search.get('next'));
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setError('root', { message: authenticationErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {search.get('reset') === 'success' && (
        <p
          role="status"
          className="border-primary/40 bg-primary/10 text-heading rounded border p-3 text-sm"
        >
          Your password was reset. Sign in with your new password.
        </p>
      )}
      {errors.root?.message && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm"
        >
          {errors.root.message}
        </p>
      )}
      <Field label="Email address" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          className="min-h-11"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          className="min-h-11"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>
      <div className="flex justify-end">
        <Link
          href="/admin/forgot-password"
          className="text-primary text-sm font-semibold hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>
    </form>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-heading block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {error && <span className="text-destructive block font-normal">{error}</span>}
    </label>
  );
}

function safeAdminDestination(value: string | null): string {
  return value?.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}
