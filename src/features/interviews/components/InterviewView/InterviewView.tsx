'use client';

import { SkeletonText } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, NotFoundState } from '@/shared/ui';
import { useInterview } from '../../api/queries';
import type { Interview } from '../../model/interview.schema';
import { InterviewRoom } from './InterviewRoom';
import { InterviewReview, InterviewSubmitted } from './InterviewReview';
import { Preflight } from './Preflight';

/** F9: one route, four stages — pre-flight, room, review, submitted — by interview status. */
export function InterviewView({ interviewId }: { interviewId: string }) {
  const interview = useInterview(interviewId);
  return (
    <AsyncBoundary
      query={interview}
      errorTitle="This interview didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that interview"
          message="The link may be incomplete. Interviews you’ve been approved for start from their open call."
          backHref={routes.expert.calls}
          backLabel="Back to open calls"
        />
      }
      loading={
        <div aria-busy="true" aria-label="Loading interview">
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {(data) => <Stage interview={data} />}
    </AsyncBoundary>
  );
}

function Stage({ interview }: { interview: Interview }) {
  switch (interview.status) {
    case 'ready':
      return <Preflight interview={interview} />;
    case 'in_progress':
    case 'paused':
      return <InterviewRoom interview={interview} />;
    case 'review':
      return <InterviewReview interview={interview} />;
    default:
      return <InterviewSubmitted interview={interview} />;
  }
}
