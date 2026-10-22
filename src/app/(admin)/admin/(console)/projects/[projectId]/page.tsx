import { redirect } from 'next/navigation';
import { routes } from '@/shared/config/routes';

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(routes.admin.projectStep(projectId, 'brief'));
}
