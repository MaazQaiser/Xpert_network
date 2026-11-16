'use client';

import { useId, useState } from 'react';
import { Button, InlineLoading, InlineNotification, SkeletonText } from '@carbon/react';
import { CheckmarkFilled, Information, WarningAltFilled } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import {
  useBriefSearches,
  useSearch,
  useSearchStream,
  useStartSearch,
  useStopSearch,
} from '../../api/queries';
import type { ChatBlock } from '../../model/home.schema';
import {
  checkedCount,
  costText,
  credits,
  dollars,
  groupProgressText,
  outcomeText,
  people,
} from './searchFormat';
import styles from './SearchCard.module.scss';

type Confirm = Extract<ChatBlock, { kind: 'searchConfirm' }>;

/** The requirements it searches on: the shared ones, then each profile group's. */
function Columns({ block }: { block: Confirm }) {
  // A shared column has no group: null, or "" as the backend sends it.
  const shared = block.columns.filter((c) => !c.group);
  const groups = block.groups.map((group) => ({
    ...group,
    columns: block.columns.filter((c) => c.group === group.name),
  }));
  const list = (label: string, items: Confirm['columns']) => (
    <div className={styles.columnGroup}>
      <p className={styles.columnGroupTitle} aria-hidden="true">
        {label}
      </p>
      <ul className={styles.columns} aria-label={label}>
        {items.map((c) => (
          <li key={c.id}>{c.label}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className={styles.columnGroups}>
      {shared.length > 0 ? list('Every match needs', shared) : null}
      {groups.map((g) =>
        g.columns.length > 0 ? (
          <div key={g.name}>
            {list(g.quota === null ? `${g.name}` : `${g.name} (${g.quota} needed)`, g.columns)}
          </div>
        ) : null,
      )}
    </div>
  );
}

/** A started search: live progress with Stop, then how it ended and what it cost. */
function SearchProgress({
  searchId,
  block,
  onOpenResults,
}: {
  searchId: string;
  block: Confirm;
  onOpenResults?: ((searchId: string) => void) | undefined;
}) {
  const query = useSearch(searchId);
  useSearchStream(searchId);
  const stop = useStopSearch(searchId);
  const search = query.data;

  if (!search) {
    return query.isError ? (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title="The search didn’t load."
        subtitle={toUserMessage(query.error)}
      />
    ) : (
      <InlineLoading status="active" description="Starting the search…" />
    );
  }

  const running = search.status === 'running';
  const groups = groupProgressText(search);
  const viewResults = onOpenResults ? (
    <Button kind="tertiary" size="sm" onClick={() => onOpenResults(search.id)}>
      View results
    </Button>
  ) : null;

  if (running) {
    return (
      <>
        <p className={styles.line}>
          {`Searching for ${people(search.target)} · ${search.progress.matches} found · ` +
            `${checkedCount(search)} checked · ${dollars(search.cost.totalDollars)} so far`}
        </p>
        {groups ? <p className={styles.meta}>{groups}</p> : null}
        {stop.error ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Couldn’t stop the search."
            subtitle={toUserMessage(stop.error)}
          />
        ) : null}
        <div className={styles.actions}>
          {viewResults}
          <Button
            kind="danger--ghost"
            size="sm"
            disabled={stop.isPending || stop.isSuccess}
            onClick={() => stop.mutate()}
          >
            {stop.isPending || stop.isSuccess ? 'Stopping…' : 'Stop'}
          </Button>
        </div>
      </>
    );
  }

  const Icon =
    search.status === 'found'
      ? CheckmarkFilled
      : search.status === 'failed'
        ? WarningAltFilled
        : Information;
  const iconClass =
    search.status === 'found'
      ? styles.iconFound
      : search.status === 'failed'
        ? styles.iconFailed
        : styles.iconEnded;
  return (
    <>
      <p className={styles.outcome} role="status">
        <Icon className={iconClass} aria-hidden="true" />
        <span>{outcomeText(search, block.exaBudget)}</span>
      </p>
      {search.status !== 'found' ? (
        <p className={styles.meta}>
          {`${search.progress.matches} of ${search.target} found · ${checkedCount(search)} checked`}
        </p>
      ) : null}
      {groups ? <p className={styles.meta}>{groups}</p> : null}
      <p className={styles.meta}>{costText(search.cost)}</p>
      <div className={styles.actions}>{viewResults}</div>
    </>
  );
}

/**
 * Scio's people search card. Before it starts: who it looks for, on what, within what budget,
 * with Start and Cancel. Once started: live progress with Stop; when it ends, the outcome and
 * what it cost.
 */
export function SearchCard({
  block,
  onOpenResults,
  conversationId = null,
}: {
  block: Confirm;
  onOpenResults?: ((searchId: string) => void) | undefined;
  /** The chat it was asked in, saved with the search. */
  conversationId?: string | null;
}) {
  const titleId = useId();
  const searches = useBriefSearches(block.briefId);
  const start = useStartSearch();
  const [startedId, setStartedId] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  // A search started from this card: the first one after it was prepared (the list is newest
  // first).
  const preparedAt = Date.parse(block.preparedAt);
  const fromList = searches.data?.filter((s) => Date.parse(s.startedAt) >= preparedAt).at(-1);
  const searchId = startedId ?? fromList?.id ?? null;

  let body;
  if (searchId) {
    body = <SearchProgress searchId={searchId} block={block} onOpenResults={onOpenResults} />;
  } else if (searches.isPending) {
    body = <SkeletonText paragraph lineCount={3} />;
  } else if (cancelled) {
    body = <p className={styles.meta}>Cancelled. Nothing was searched.</p>;
  } else {
    body = (
      <>
        <p className={styles.line}>
          {block.target === null
            ? `Find people for ${block.company}`
            : `Find ${people(block.target)} for ${block.company}`}
        </p>
        <Columns block={block} />
        <p className={styles.meta}>
          {`Web budget ${dollars(block.exaBudget)} · ` +
            `Profile search up to ${credits(block.fullenrichCreditCap)} credits`}
        </p>
        {start.error ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="The search didn’t start."
            subtitle={toUserMessage(start.error)}
          />
        ) : null}
        {block.ready ? (
          <div className={styles.actions}>
            <Button
              kind="primary"
              size="sm"
              disabled={start.isPending}
              onClick={() =>
                void start
                  .mutateAsync({ briefId: block.briefId, conversationId })
                  .then((started) => setStartedId(started.id))
                  .catch(() => undefined)
              }
            >
              {start.isPending ? 'Starting…' : 'Start'}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={start.isPending}
              onClick={() => setCancelled(true)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Can’t start yet."
            subtitle={block.blocker ?? 'Check the requirements first.'}
          />
        )}
      </>
    );
  }

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        People search: {block.company}
      </h3>
      {body}
    </section>
  );
}
