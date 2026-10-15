import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthFrame title="Log in to Xpert Network">
      <LoginForm realm="app" />
    </AuthFrame>
  );
}
