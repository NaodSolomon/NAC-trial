'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { browserApiClient } from '@/lib/api/browser-client';
import { recoveryErrorMessage } from './auth-errors';
import { AuthFormAlert, AuthFormField } from './AuthFormField';
import { passwordPolicyText, resetPasswordSchema, type ResetPasswordValues } from './auth.schemas';

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <div className="space-y-5 text-center">
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm"
        >
          This reset link is invalid or incomplete. Request a new password reset email.
        </p>
        <Link href="/admin/forgot-password" className="text-primary font-semibold hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const submit = handleSubmit(async ({ newPassword }) => {
    try {
      await browserApiClient.post('/auth/password-reset/confirm', { token, newPassword });
      router.replace('/admin/login?reset=success');
    } catch (error) {
      setError('root', { message: recoveryErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.root?.message && <AuthFormAlert>{errors.root.message}</AuthFormAlert>}
      <AuthFormField
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={passwordPolicyText}
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <AuthFormField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" size="lg" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}
