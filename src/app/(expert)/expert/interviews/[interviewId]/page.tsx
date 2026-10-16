import type { Metadata } from 'next';
import { InterviewView } from '@/features/interviews';

export const metadata: Metadata = { title: 'Interview' };

export default async function Page({ params }: { params: Promise<{ interviewId: string }> }) {
  const { interviewId } = await params;
  return <InterviewView interviewId={interviewId} />;
}
