import type { Metadata } from 'next';
import { AuthCard, ForgotPasswordForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Reset administrator password | Nehemiah Autism Center',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your administrator email. The response will not reveal whether an account exists."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
