import type { Metadata } from 'next';
import { RoleSelect, SignUpForm, signUpRoleSchema } from '@/features/auth';
import { AuthFrame } from '@/features/marketing';

export const metadata: Metadata = { title: 'Sign up' };

type SignUpPageProps = { searchParams: Promise<{ role?: string | string[] }> };

/** Step 1 picks a role (`/sign-up`); step 2 is the account form (`/sign-up?role=client`). */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const role = signUpRoleSchema.safeParse((await searchParams).role);
  if (!role.success) {
    return (
      <AuthFrame
        title="Create your account"
        description="Tell us how you’ll use Proptyop. You’ll add your details next."
      >
        <RoleSelect />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame
      title={role.data === 'expert' ? 'Join as an expert' : 'Create your account'}
      description={
        role.data === 'expert'
          ? 'Sign up, tell us what you know, and we’ll review your profile within 2 business days.'
          : 'Get expert-backed answers to the questions behind your next decision.'
      }
    >
      <SignUpForm role={role.data} />
    </AuthFrame>
  );
}
