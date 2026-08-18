'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AuthFormAlert, AuthFormField } from './AuthFormField';
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
      {errors.root?.message && <AuthFormAlert>{errors.root.message}</AuthFormAlert>}
      <AuthFormField
        label="Email address"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        error={errors.email?.message}
        {...register('email')}
      />
      <AuthFormField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
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

function safeAdminDestination(value: string | null): string {
  return value?.startsWith('/admin') && !value.startsWith('//') ? value : '/admin';
}
