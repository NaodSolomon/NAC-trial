import type { Metadata } from 'next';
import { AuthCard, LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Administrator sign in | Nehemiah Autism Center' };

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Administrator sign in"
      description="Use your authorized staff account to continue."
    >
      <LoginForm />
    </AuthCard>
  );
}
