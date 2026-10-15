import type { Metadata } from 'next';
import { RoleSelect } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Choose your role' };

export default function RoleSelectPage() {
  return (
    <AuthFrame title="How will you use Proptyop?">
      <RoleSelect />
    </AuthFrame>
  );
}
