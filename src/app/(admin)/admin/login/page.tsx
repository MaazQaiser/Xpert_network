import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import { AuthFrame, PublicShell } from '@/features/marketing';

export const metadata: Metadata = { title: 'Admin log in' };

export default function AdminLoginPage() {
  return (
    <PublicShell variant="admin">
      <AuthFrame title="Admin console" description="For Proptyop staff only.">
        <LoginForm realm="admin" />
      </AuthFrame>
    </PublicShell>
  );
}
