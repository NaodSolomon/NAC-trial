'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { browserApiClient } from '@/lib/api/browser-client';
import { recoveryErrorMessage } from './auth-errors';
import { AuthFormAlert, AuthFormField } from './AuthFormField';
import { forgotPasswordSchema, type ForgotPasswordValues } from './auth.schemas';

const genericMessage = 'If the account exists, password reset instructions have been sent.';

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string>();
  const confirmation = useRef<HTMLParagraphElement | null>(null);

  // Submitting replaces the form, so the focused control disappears. Without this the
  // caret falls back to the document and keyboard users lose their place on the page.
  useEffect(() => {
    if (message) confirmation.current?.focus();
  }, [message]);
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
          ref={confirmation}
          role="status"
          tabIndex={-1}
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
      {errors.root?.message && <AuthFormAlert>{errors.root.message}</AuthFormAlert>}
      <AuthFormField
        label="Administrator email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        error={errors.email?.message}
        {...register('email')}
      />
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
