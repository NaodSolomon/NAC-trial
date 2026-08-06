import type { Metadata } from 'next';
import { AuthCard, ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Choose a new password | Nehemiah Autism Center' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="This secure link can be used only once and expires shortly."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
