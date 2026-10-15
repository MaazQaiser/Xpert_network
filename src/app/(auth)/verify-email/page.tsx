import type { Metadata } from 'next';
import { VerifyEmailNotice } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Verify your email' };

export default function VerifyEmailPage() {
  return (
    <AuthFrame title="Check your inbox">
      <VerifyEmailNotice />
    </AuthFrame>
  );
}
