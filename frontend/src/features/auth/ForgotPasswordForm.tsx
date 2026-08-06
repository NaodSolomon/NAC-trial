'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { browserApiClient } from '@/lib/api/browser-client';
import { recoveryErrorMessage } from './auth-errors';
import { Field } from './LoginForm';
import { forgotPasswordSchema, type ForgotPasswordValues } from './auth.schemas';

const genericMessage = 'If the account exists, password reset instructions have been sent.';

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const submit = handleSubmit(async (values) => {
    try {
      await browserApiClient.post('/auth/password-reset/request', values);
      setMessage(genericMessage);
    } catch (error) {
      setError('root', { message: recoveryErrorMessage(error) });
    }
  });

  if (message) {
    return (
      <div className="space-y-5 text-center">
        <p
          role="status"
          className="border-primary/40 bg-primary/10 text-heading rounded border p-4 text-sm"
        >
          {message}
        </p>
        <Link
          href="/admin/login"
          className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.root?.message && (
        <p role="alert" className="text-destructive text-sm">
          {errors.root.message}
        </p>
      )}
      <Field label="Administrator email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          className="min-h-11"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Button type="submit" size="lg" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send reset instructions'}
      </Button>
      <Link
        href="/admin/login"
        className="text-primary block text-center text-sm font-semibold hover:underline"
      >
        Return to sign in
      </Link>
    </form>
  );
}
