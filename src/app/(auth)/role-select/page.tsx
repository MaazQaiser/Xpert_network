import { redirect } from 'next/navigation';
import { routes } from '@/shared/config/routes';

/** Role select is step 1 of sign-up (F0). */
export default function RoleSelectPage() {
  redirect(routes.signUp);
}
