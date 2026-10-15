import type { Metadata } from 'next';
import { RoleSelect } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignUpPage() {
  return (
    <AuthFrame
      title="Create your account"
      description="Tell us how you’ll use Proptyop. You can add your details in the next step."
    >
      <RoleSelect />
    </AuthFrame>
  );
}
