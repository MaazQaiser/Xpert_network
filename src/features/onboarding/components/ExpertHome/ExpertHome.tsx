'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from '@carbon/icons-react';
import { InlineNotification, SkeletonText } from '@carbon/react';
import { useSession } from '@/features/auth';
import { FloatingComposer } from '@/features/goal-chat';
import { useInterviews, InterviewsList } from '@/features/interviews';
import { sortCalls, useCalls, type OpenCall } from '@/features/open-calls';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { ErrorState, StatusTag } from '@/shared/ui';
import styles from './ExpertHome.module.scss';

const TOPIC_LIMIT = 4;

/** Profile matches first, then any call she has already requested. */
function topicsToShow(calls: OpenCall[]): OpenCall[] {
  const sorted = sortCalls(calls);
  const fitting = sorted.filter((call) => call.match.level !== 'partial');
  const picked = fitting.slice(0, TOPIC_LIMIT);
  for (const call of sorted) {
    if (call.application?.status === 'applied' && !picked.some((item) => item.id === call.id)) {
      picked.push(call);
    }
  }
  return picked.length > 0 ? picked : sorted.slice(0, TOPIC_LIMIT);
}

function profileMark(call: OpenCall): { tone: 'success' | 'progress'; label: string } | null {
  const matches = call.match.level === 'strong' || call.match.level === 'good';
  const requested = call.application?.status === 'applied';
  if (requested && matches) return { tone: 'success', label: 'Requested · matches your profile' };
  if (matches) return { tone: 'success', label: 'Matches your profile' };
  if (requested) return { tone: 'progress', label: 'Requested' };
  return null;
}

/** Best open call for what she typed, preferring a closer profile match when several fit. */
function callForPrompt(calls: OpenCall[], text: string): OpenCall | null {
  const words = text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  if (words.length === 0) return null;
  let best: { call: OpenCall; hits: number } | null = null;
  for (const call of calls) {
    const hay =
      `${call.title} ${call.topics.join(' ')} ${call.brief} ${call.industry.label}`.toLowerCase();
    const hits = words.filter((word) => hay.includes(word)).length;
    if (hits === 0) continue;
    if (
      !best ||
      hits > best.hits ||
      (hits === best.hits && call.match.score > best.call.match.score)
    ) {
      best = { call, hits };
    }
  }
  return best?.call ?? null;
}

/**
 * Expert home once approved: interview topics she can take, marked when they fit her
 * profile, with the ask field docked at the bottom.
 */
export function ExpertHome() {
  const router = useRouter();
  const session = useSession();
  const calls = useCalls();
  const interviews = useInterviews();
  const [promptMiss, setPromptMiss] = useState(false);
  const firstName = session.data?.user?.name.split(' ')[0];
  const topics = calls.data ? topicsToShow(calls.data) : [];

  const openTopic = (text: string) => {
    const match = calls.data ? callForPrompt(calls.data, text) : null;
    if (!match) {
      setPromptMiss(true);
      return;
    }
    setPromptMiss(false);
    router.push(routes.expert.session(match.id));
  };

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <header className={styles.header}>
          <div className={styles.intro}>
            <h1 className={styles.title}>{firstName ? `Welcome, ${firstName}` : 'Welcome'}</h1>
            <p className={styles.subtitle}>
              Topics clients are asking about now. The ones that fit your profile are marked.
            </p>
          </div>
          <StatusTag tone="success" label="Approved expert" />
        </header>

        <section className={styles.section} aria-labelledby="topics-heading">
          <h2 id="topics-heading" className={styles.sectionTitle}>
            Topics you can interview on
          </h2>
          {calls.isPending ? (
            <SkeletonText paragraph lineCount={4} />
          ) : calls.isError ? (
            <ErrorState
              title="Couldn’t load interview topics"
              message={toUserMessage(calls.error)}
              onRetry={() => void calls.refetch()}
            />
          ) : topics.length === 0 ? (
            <p className={styles.empty}>No interview topics are open right now.</p>
          ) : (
            <ul className={styles.cards} aria-label="Topics you can interview on">
              {topics.map((call) => {
                const mark = profileMark(call);
                return (
                  <li key={call.id} className={styles.card}>
                    <Link href={routes.expert.session(call.id)} className={styles.cardLink}>
                      <span className={styles.kind}>{call.topics.join(' · ')}</span>
                      <span className={styles.cardTitle}>{call.title}</span>
                    </Link>
                    {mark ? (
                      <span className={styles.mark}>
                        <StatusTag tone={mark.tone} size="sm" label={mark.label} />
                      </span>
                    ) : null}
                    <ChevronRight className={styles.chevron} aria-hidden={true} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {interviews.isError ? (
          <ErrorState
            title="Couldn’t load your interviews"
            message={toUserMessage(interviews.error)}
            onRetry={() => void interviews.refetch()}
          />
        ) : interviews.data && interviews.data.length > 0 ? (
          <section className={styles.section} aria-labelledby="interviews-heading">
            <div className={styles.sectionHeader}>
              <h2 id="interviews-heading" className={styles.sectionTitle}>
                Your interviews
              </h2>
              <Link href={routes.expert.earnings}>View earnings</Link>
            </div>
            <InterviewsList />
          </section>
        ) : null}
      </div>

      <div className={styles.ask}>
        {promptMiss ? (
          <InlineNotification
            kind="info"
            title="No open interview covers that"
            subtitle="Pick a topic above, or try different words."
            lowContrast
            onCloseButtonClick={() => setPromptMiss(false)}
          />
        ) : null}
        <FloatingComposer
          placement="dock"
          autoFocus
          label="Describe a topic you can give an interview on"
          placeholder="e.g. Coffee sourcing in Saudi Arabia"
          isDisabled={calls.isPending || calls.isError}
          disabledHint={
            calls.isError
              ? 'Topics didn’t load, so this can’t search yet.'
              : 'Loading topics you can interview on.'
          }
          onSend={openTopic}
        />
      </div>
    </div>
  );
}
