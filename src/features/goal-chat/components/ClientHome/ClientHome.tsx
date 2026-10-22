'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, InlineNotification, SkeletonText } from '@carbon/react';
import { ChevronRight, PlayFilledAlt } from '@carbon/icons-react';
import type { ComponentType } from 'react';
import { useDemoAutoplay } from '@/features/prototype-toolbar';
import { useSession } from '@/features/auth';
import { STATUS_LABELS, useRequests, type CustomRequest } from '@/features/custom-requests';
import { useLibrary, type LibraryEntry, type LibraryFilters } from '@/features/library';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { ErrorState } from '@/shared/ui';
import { useBriefs, useCreateBrief } from '../../api/queries';
import { GOAL_TYPE_LABELS, type GoalType, type ResearchBrief } from '../../model/brief.schema';
import { homeStoryFor, type StoryFragment } from '../../model/homeStories';
import { setPendingPrompt } from '../../model/pendingPrompt';
import { FloatingComposer } from '../FloatingComposer/FloatingComposer';
import { GoalChat } from '../GoalChat/GoalChat';
import styles from './ClientHome.module.scss';

const QUICK_STARTS: GoalType[] = ['invest', 'expand', 'market'];

const EMPTY_FILTERS: LibraryFilters = {
  q: '',
  industry: null,
  regionIds: [],
  maxPrice: null,
  ownedOnly: false,
};

const BRIEF_LINE = 'The library already answered the headline. Custom research is the next step.';

function StoryWords({ part }: { part: StoryFragment }) {
  if (!part.emphasis) return part.text;
  return <mark className={styles.keyword}>{part.text}</mark>;
}

function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function requestLine(request: CustomRequest): string {
  const note = [...request.timeline].reverse().find((entry) => entry.note)?.note;
  return note ?? STATUS_LABELS[request.status];
}

function requestHref(request: CustomRequest): string {
  if (request.delivery?.reportId) return routes.client.report(request.delivery.reportId);
  return routes.client.request(request.id);
}

type JourneyCardProps = {
  href: string;
  kind: string;
  title: string;
  detail: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

function JourneyCard({ href, kind, title, detail, icon: Icon = ChevronRight }: JourneyCardProps) {
  return (
    <li>
      <Link href={href} className={styles.card}>
        <span className={styles.cardText}>
          <span className={styles.kind}>{kind}</span>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardDetail}>{detail}</span>
        </span>
        <Icon className={styles.chevron} aria-hidden={true} />
      </Link>
    </li>
  );
}

type StoryCardsProps = {
  demoAutoplay: boolean;
  libraryItem: LibraryEntry | undefined;
  libraryError: unknown;
  onRetryLibrary: () => void;
  brief: ResearchBrief | undefined;
  briefsError: unknown;
  onRetryBriefs: () => void;
  request: CustomRequest | undefined;
  requestsError: unknown;
  onRetryRequests: () => void;
};

function StoryCards({
  demoAutoplay,
  libraryItem,
  libraryError,
  onRetryLibrary,
  brief,
  briefsError,
  onRetryBriefs,
  request,
  requestsError,
  onRetryRequests,
}: StoryCardsProps) {
  return (
    <ul className={styles.cards} aria-label="Journeys from your story">
      {libraryError ? (
        <li>
          <ErrorState
            title="Couldn’t load the library"
            message={toUserMessage(libraryError)}
            onRetry={onRetryLibrary}
          />
        </li>
      ) : libraryItem ? (
        <JourneyCard
          href={routes.client.report(libraryItem.id)}
          kind="New in the library"
          title={libraryItem.title}
          detail={`${libraryItem.category.industry} · ${formatDate(libraryItem.publishedAt)}`}
        />
      ) : null}
      {briefsError ? (
        <li>
          <ErrorState
            title="Couldn’t load your brief"
            message={toUserMessage(briefsError)}
            onRetry={onRetryBriefs}
          />
        </li>
      ) : brief ? (
        <JourneyCard
          href={
            demoAutoplay ? `${routes.client.brief(brief.id)}?play=1` : routes.client.brief(brief.id)
          }
          kind={demoAutoplay ? 'Play conversation' : 'Your brief'}
          title={brief.title}
          detail={BRIEF_LINE}
          {...(demoAutoplay ? { icon: PlayFilledAlt } : {})}
        />
      ) : null}
      {requestsError ? (
        <li>
          <ErrorState
            title="Couldn’t load your request"
            message={toUserMessage(requestsError)}
            onRetry={onRetryRequests}
          />
        </li>
      ) : request ? (
        <JourneyCard
          href={requestHref(request)}
          kind="Follow-up"
          title={request.title}
          detail={requestLine(request)}
        />
      ) : null}
    </ul>
  );
}

/**
 * Client home: greeting, the persona’s story, and journey cards centred on the page.
 * The ask field stays docked at the bottom.
 */
export function ClientHome() {
  const session = useSession();
  const create = useCreateBrief();
  const [briefId, setBriefId] = useState<string | null>(null);
  const demoAutoplay = useDemoAutoplay();
  const story = homeStoryFor(session.data?.user?.personaId);
  const library = useLibrary(EMPTY_FILTERS);
  const briefs = useBriefs();
  const requests = useRequests();
  const firstName = session.data?.user?.name.split(' ')[0];
  const cardsPending =
    session.isPending ||
    (story != null && (library.isPending || briefs.isPending || requests.isPending));

  const startFromText = (text: string) => {
    create.mutate(undefined, {
      onSuccess: (brief) => {
        setPendingPrompt(brief.id, text);
        setBriefId(brief.id);
      },
    });
  };

  const libraryItem = library.data?.items.find((item) => item.id === story?.libraryId);
  const brief = briefs.data?.find((item) => item.id === story?.briefId);
  const request = requests.data?.find((item) => item.id === story?.requestId);

  if (briefId) {
    return (
      <div className={`${styles.root} ${styles.chatting}`}>
        <GoalChat briefId={briefId} layout="stage" />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <div className={styles.column}>
          <header className={styles.intro}>
            <h1 className={styles.greeting}>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
          </header>

          {session.isPending ? (
            <SkeletonText paragraph lineCount={2} />
          ) : story ? (
            <div className={styles.story}>
              <div className={styles.storyText}>
                {story.lines.map((line) => (
                  <p key={line.map((part) => part.text).join('')}>
                    {line.map((part) => (
                      <StoryWords key={`${part.emphasis ? 'e' : 't'}-${part.text}`} part={part} />
                    ))}
                  </p>
                ))}
              </div>
              <AIExplainLabel
                size="mini"
                aria-label="About this home story"
                summary="This is your home story for this demo persona."
                basis="The library report, the brief, and the request named below."
              />
            </div>
          ) : null}

          {cardsPending ? (
            <div aria-busy="true" aria-label="Loading your stories">
              <SkeletonText paragraph lineCount={3} />
            </div>
          ) : story ? (
            <StoryCards
              demoAutoplay={demoAutoplay}
              libraryItem={libraryItem}
              libraryError={library.isError ? library.error : null}
              onRetryLibrary={() => void library.refetch()}
              brief={brief}
              briefsError={briefs.isError ? briefs.error : null}
              onRetryBriefs={() => void briefs.refetch()}
              request={request}
              requestsError={requests.isError ? requests.error : null}
              onRetryRequests={() => void requests.refetch()}
            />
          ) : null}
        </div>
      </div>

      <div className={styles.ask}>
        {create.isError ? (
          <InlineNotification
            kind="error"
            title="Couldn’t start a new brief"
            subtitle={toUserMessage(create.error)}
            lowContrast
            onCloseButtonClick={() => create.reset()}
          />
        ) : null}
        <div className={styles.quickStarts} role="group" aria-label="Quick starts">
          {QUICK_STARTS.map((goal) => (
            <Button
              key={goal}
              as={Link}
              href={`${routes.client.ask}?goal=${goal}`}
              kind="tertiary"
              size="sm"
              className={styles.quickStart}
            >
              {GOAL_TYPE_LABELS[goal]}
            </Button>
          ))}
        </div>
        <FloatingComposer
          placement="dock"
          autoFocus
          label="Describe your research goal"
          placeholder="e.g. Should we open 3 café franchises in Riyadh next year?"
          isBusy={create.isPending}
          onSend={startFromText}
        />
      </div>
    </div>
  );
}
