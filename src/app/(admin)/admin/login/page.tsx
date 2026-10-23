import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';
import { AdminLoginFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Admin log in' };

export default function AdminLoginPage() {
  return (
    <AdminLoginFrame title="Admin console" description="For Xpert Network staff only.">
      <LoginForm realm="admin" />
    </AdminLoginFrame>
  );
}
