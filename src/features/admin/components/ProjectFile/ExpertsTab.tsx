'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  DataTableSkeleton,
  InlineLoading,
  IconButton,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import {
  CheckmarkFilled,
  CircleDash,
  InProgress,
  MisuseOutline,
  Renew,
  Send,
} from '@carbon/icons-react';
import { CountryFlag } from '@/shared/ui';
import { useExpertSearch, useResponses, useSendScreening } from '../../api/queries';
import { RESPONSE_STATUS_LABELS, type ResponseStatus } from '../../model/responses.schema';
import type { ExtendResearch } from '../../model/expertSearch.schema';
import type { MatchedExpert } from '../../model/match.schema';
import type { Project } from '../../model/project.schema';
import { ExtendResearchSheet } from './ExtendResearchSheet';
import type { ProjectNotice } from './ProjectFile';
import styles from './ExpertsTab.module.scss';

const HEADERS = ['Expert', 'Relevant role', 'Experience', 'Country', 'Match', 'Screening'] as const;
const FIRST_BATCH = 8;
// Found experts join the table one at a time, so the search reads as work in progress.
const REVEAL_MS = process.env.NODE_ENV === 'test' ? 0 : 450;

type Phase = 'idle' | 'searching' | 'revealing' | 'done';

type ExpertsTabProps = {
  project: Project;
  /** How many experts the table shows so far (for the tab's count). */
  onFound: (count: number) => void;
  onNotice: (notice: ProjectNotice) => void;
};

/**
 * Screen 03 Experts tab: empty until the PM starts the search; then a skeleton while the AI
 * searches, and the found experts appearing one by one. Each row can be sent the screening
 * questions, and "Extend research" opens a sheet to look for more.
 */
export function ExpertsTab({ project, onFound, onNotice }: ExpertsTabProps) {
  const search = useExpertSearch(project.id);
  const screening = useSendScreening(project.id);
  const [phase, setPhase] = useState<Phase>('idle');
  const [experts, setExperts] = useState<MatchedExpert[]>([]);
  const [shown, setShown] = useState(0);
  const [sent, setSent] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Screening replies, checked when the PM refreshes the table; until then a sent row says Sent.
  const responses = useResponses(project.id, { enabled: false });
  const [replies, setReplies] = useState<Record<string, ResponseStatus>>({});
  const [isChecking, setIsChecking] = useState(false);
  const extendButton = useRef<HTMLButtonElement>(null);

  // Reveal the found experts one by one; the last one switches the search to done.
  useEffect(() => {
    if (phase !== 'revealing' || shown >= experts.length) return;
    const timer = window.setTimeout(() => {
      setShown((count) => count + 1);
      onFound(shown + 1);
      if (shown + 1 >= experts.length) setPhase('done');
    }, REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, shown, experts.length, onFound]);

  const run = (limit: number, criteria?: ExtendResearch) => {
    setPhase('searching');
    search.mutate(
      {
        offset: experts.length,
        limit,
        ...(criteria ? { criteria, excludeIds: experts.map((e) => e.id) } : {}),
      },
      {
        onSuccess: (result) => {
          setExperts((current) => [...current, ...result.experts]);
          setSent(result.screeningSent);
          setRemaining(result.remaining);
          setPhase(result.experts.length > 0 ? 'revealing' : 'done');
        },
        onError: (error) => {
          setPhase(experts.length > 0 ? 'done' : 'idle');
          onNotice({ kind: 'error', error });
        },
      },
    );
  };

  const send = (expert: MatchedExpert) =>
    screening.mutate(expert.id, {
      onSuccess: (result) => {
        setSent(result.screeningSent);
        onNotice({
          kind: 'success',
          message: `Screening questions sent to ${expert.label}. Their answers will appear here.`,
        });
      },
      onError: (error) => onNotice({ kind: 'error', error }),
    });

  const refresh = async () => {
    setIsChecking(true);
    const result = await responses.refetch();
    setIsChecking(false);
    if (result.data) {
      const next = Object.fromEntries(result.data.responses.map((r) => [r.expertId, r.status]));
      setReplies(next);
      const answered = result.data.responses.filter((r) => r.status === 'answered').length;
      onNotice({
        kind: 'success',
        message: `Screening status updated: ${answered} of ${sent.length} answered.`,
      });
    } else if (result.error) {
      onNotice({ kind: 'error', error: result.error });
    }
  };

  const visible = experts.slice(0, shown);
  const isBusy = phase === 'searching' || phase === 'revealing';

  return (
    <section className={styles.root} aria-labelledby="experts-title">
      <div className={styles.header}>
        <h2 id="experts-title" className={styles.title}>
          Experts
        </h2>
        {phase === 'done' && experts.length > 0 ? (
          <span className={styles.refreshSlot}>
            <IconButton
              kind="ghost"
              size="md"
              align="top-end"
              label={isChecking ? 'Checking for answers…' : 'Refresh screening status'}
              disabled={isChecking || sent.length === 0}
              onClick={() => void refresh()}
              className={isChecking ? styles.spinning : undefined}
            >
              <Renew />
            </IconButton>
          </span>
        ) : null}
        <p className={styles.status} aria-live="polite">
          {phase === 'idle'
            ? 'No experts yet. Start the search to find experts who match this brief.'
            : phase === 'searching'
              ? 'Searching the expert network…'
              : phase === 'revealing'
                ? `Found ${shown} of ${experts.length}…`
                : experts.length === 0
                  ? 'No matching experts found yet.'
                  : `${experts.length} experts found${sent.length > 0 ? ` · ${sent.length} sent screening questions` : ''}.`}
        </p>
      </div>

      {phase === 'searching' && experts.length === 0 ? (
        <DataTableSkeleton
          aria-label="Finding experts"
          headers={HEADERS.map((header) => ({ key: header, header }))}
          columnCount={HEADERS.length}
          rowCount={6}
          showHeader={false}
          showToolbar={false}
        />
      ) : (
        <TableContainer>
          <Table size="lg" aria-label="Experts for this project">
            <TableHead>
              <TableRow>
                {HEADERS.map((header) => (
                  <TableHeader key={header}>{header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((expert) => {
                const isSent = sent.includes(expert.id);
                return (
                  <TableRow key={expert.id} className={styles.row}>
                    <TableCell className={styles.expert}>{expert.label}</TableCell>
                    <TableCell>
                      <Tag type="cool-gray" size="md" className={styles.role}>
                        {expert.role}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      {expert.years} {expert.years === 1 ? 'year' : 'years'}
                    </TableCell>
                    <TableCell>
                      <CountryFlag code={expert.country} />
                    </TableCell>
                    <TableCell>
                      <span className={styles.match}>
                        <span>{expert.matchPercent}%</span>
                        {/* The match as a bar under the number; the number is what's read out. */}
                        <span className={styles.matchTrack} aria-hidden="true">
                          <span
                            className={styles.matchFill}
                            style={{ inlineSize: `${expert.matchPercent}%` }}
                          />
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className={styles.actionCell}>
                      {/* Carbon's row-action pattern: an icon button named by its tooltip (also
                          shown on keyboard focus); once sent, the status stays visible. */}
                      {isSent ? (
                        <ScreeningStatus status={replies[expert.id] ?? null} />
                      ) : (
                        <IconButton
                          kind="ghost"
                          size="sm"
                          align="top-end"
                          label="Send screening questions"
                          disabled={screening.isPending}
                          onClick={() => send(expert)}
                        >
                          <Send />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* While searching for more, a few skeleton rows follow the found experts. */}
              {phase === 'searching' && experts.length > 0
                ? [0, 1, 2].map((i) => (
                    <TableRow key={`loading-${i}`} aria-hidden="true">
                      {HEADERS.map((header) => (
                        <TableCell key={header}>
                          <span className={styles.skeletonBar} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : null}
              {phase === 'idle' ? (
                <TableRow>
                  <TableCell colSpan={HEADERS.length}>
                    <div className={styles.empty}>
                      <p className={styles.emptyTitle}>No experts yet</p>
                      <p className={styles.emptyText}>
                        The AI searches the network for people who match the expert profile and the
                        client questions.
                      </p>
                      <Button onClick={() => run(FIRST_BATCH)}>Start finding experts</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {phase === 'done' && experts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={HEADERS.length}>
                    <div className={styles.empty}>
                      <p className={styles.emptyTitle}>No matching experts yet</p>
                      <p className={styles.emptyText}>
                        No one in the current pool fits this expert profile. Extend the research to
                        look further, for example on LinkedIn.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {phase === 'revealing' ? (
        <InlineLoading description="Adding experts as they’re found…" />
      ) : null}

      {phase === 'done' && remaining === 0 && experts.length > 0 ? (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="That’s everyone in the current pool."
          subtitle="Extend the research to look further, for example on LinkedIn."
        />
      ) : null}

      {phase !== 'idle' ? (
        <div className={styles.ctaRow}>
          <Button
            ref={extendButton}
            size="lg"
            disabled={isBusy}
            onClick={() => setIsSheetOpen(true)}
          >
            Extend research with AI
          </Button>
        </div>
      ) : null}

      {isSheetOpen ? (
        <ExtendResearchSheet
          project={project}
          onClose={() => {
            setIsSheetOpen(false);
            extendButton.current?.focus();
          }}
          onSubmit={(criteria) => {
            setIsSheetOpen(false);
            run(criteria.maxExperts, criteria);
            onNotice({
              kind: 'success',
              message: `Searching for ${criteria.minExperts}–${criteria.maxExperts} more experts.`,
            });
          }}
        />
      ) : null}
    </section>
  );
}

const STATUS_ICONS: Record<ResponseStatus, typeof CheckmarkFilled> = {
  answered: CheckmarkFilled,
  in_progress: InProgress,
  not_opened: CircleDash,
  declined: MisuseOutline,
};

const REPLY_CLASS: Record<ResponseStatus, string | undefined> = {
  answered: styles.replyAnswered,
  in_progress: styles.replyInProgress,
  not_opened: styles.replyNotOpened,
  declined: styles.replyDeclined,
};

/** "Sent" until the PM refreshes; then where the expert is with the questions. */
function ScreeningStatus({ status }: { status: ResponseStatus | null }) {
  if (!status) {
    return (
      <span className={styles.sent}>
        <CheckmarkFilled aria-hidden={true} /> Sent
      </span>
    );
  }
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`${styles.reply} ${REPLY_CLASS[status] ?? ''}`}>
      <Icon aria-hidden={true} /> {RESPONSE_STATUS_LABELS[status]}
    </span>
  );
}
