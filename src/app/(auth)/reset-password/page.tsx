import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Choose a new password' };

type ResetPasswordPageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  return (
    <AuthFrame title="Choose a new password">
      <ResetPasswordForm token={typeof token === 'string' && token ? token : null} />
    </AuthFrame>
  );
}
