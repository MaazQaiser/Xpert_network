import type { Metadata } from 'next';
import { PlaceholderScreen } from '@/shared/ui';

export const metadata: Metadata = { title: 'Outreach' };

export default function Page() {
  return (
    <PlaceholderScreen
      title="Outreach"
      flow="F19 · Outreach hiring (screens 17–23)"
      phase={6}
      description="hiring posters, applicant emails, 15-question results and onboarding for projects with no match."
    />
  );
}
