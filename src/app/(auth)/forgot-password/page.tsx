import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      title="Reset your password"
      description="Enter the email you use to log in and we’ll send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
