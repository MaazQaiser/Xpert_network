'use client';

import { useId, useState } from 'react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Toggle,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from '@carbon/react';
import { CheckmarkFilled, Close } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import { useSearch, useSearchStream, useStopSearch } from '../../api/queries';
import type { CellVerdict, Search, SearchPerson, Verdict } from '../../model/search.schema';
import { checkedCount, costText, dollars, groupProgressText } from './SearchCard';
import styles from './SearchResultsPanel.module.scss';

type Column = Search['columns'][number];

const VERDICTS: Record<Verdict, { label: string; type: 'green' | 'red' | 'gray' }> = {
  match: { label: 'Match', type: 'green' },
  miss: { label: 'Miss', type: 'red' },
  unclear: { label: 'Unclear', type: 'gray' },
};

const NOT_CHECKED: CellVerdict = { verdict: 'unclear', reason: 'Not checked yet.', references: [] };

/** The columns in table order: the shared ones, then each profile group's. */
function orderColumns(search: Search) {
  const groupNames = search.groups.map((g) => g.name);
  const isShared = (c: Column) => c.group === null || !groupNames.includes(c.group);
  const shared = search.columns.filter(isShared);
  const groups = search.groups
    .map((g) => ({ name: g.name, columns: search.columns.filter((c) => c.group === g.name) }))
    .filter((g) => g.columns.length > 0);
  return { shared, groups, all: [...shared, ...groups.flatMap((g) => g.columns)] };
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** A verdict tag that opens why: the reason and the pages it rests on. */
function VerdictCell({ cell, column }: { cell: CellVerdict; column: Column }) {
  const { label, type } = VERDICTS[cell.verdict];
  return (
    <Toggletip align="bottom" autoAlign>
      <ToggletipButton label={`${label}: ${column.label}`} className={styles.verdictButton}>
        <Tag as="span" size="sm" type={type}>
          {label}
        </Tag>
      </ToggletipButton>
      <ToggletipContent>
        <p className={styles.reason}>{cell.reason}</p>
        {cell.references.length > 0 ? (
          <ul className={styles.references} aria-label="References">
            {cell.references.map((url) => (
              <li key={url}>
                <Link href={url} target="_blank" rel="noreferrer" size="sm">
                  {hostOf(url)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </ToggletipContent>
    </Toggletip>
  );
}

/** LinkedIn, else email, else phone, else "No contact found". */
function Contact({ person }: { person: SearchPerson }) {
  if (person.linkedinUrl) {
    return (
      <Link href={person.linkedinUrl} target="_blank" rel="noreferrer" size="sm">
        LinkedIn<span className={styles.visuallyHidden}>: {person.name}</span>
      </Link>
    );
  }
  if (person.email) {
    return (
      <Link href={`mailto:${person.email}`} size="sm">
        {person.email}
      </Link>
    );
  }
  if (person.phone) {
    return (
      <Link href={`tel:${person.phone.replace(/[^\d+]/g, '')}`} size="sm">
        {person.phone}
      </Link>
    );
  }
  return <span className={styles.muted}>No contact found</span>;
}

function Source({ person }: { person: SearchPerson }) {
  if (person.source === 'fullenrich') return <>Profile search</>;
  return person.sourceUrl ? (
    <Link href={person.sourceUrl} target="_blank" rel="noreferrer" size="sm">
      Web
    </Link>
  ) : (
    <>Web</>
  );
}

/** Arrival order, whatever order the server sends them in. */
const byArrival = (people: SearchPerson[]) =>
  people
    .map((person, index) => ({ person, index }))
    .sort((a, b) => a.person.addedAt.localeCompare(b.person.addedAt) || a.index - b.index)
    .map(({ person }) => person);

function ResultsTable({
  search,
  matchesOnly,
  isNew,
  titleId,
}: {
  search: Search;
  matchesOnly: boolean;
  isNew: (id: string) => boolean;
  titleId: string;
}) {
  const { shared, groups, all } = orderColumns(search);
  const people = byArrival(search.people).filter((p) => !matchesOnly || p.isMatch);
  const byId = new Map(people.map((p) => [p.id, p]));
  const headers = [
    { key: 'name', header: 'Name' },
    { key: 'contact', header: 'Contact' },
    { key: 'company', header: 'Company and title' },
    ...all.map((c) => ({ key: c.id, header: c.label })),
    { key: 'source', header: 'Source' },
  ];
  const rows = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <DataTable rows={rows} headers={headers}>
      {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps }) => (
        <TableContainer className={styles.table}>
          <Table {...getTableProps()} aria-labelledby={titleId} size="sm">
            <TableHead>
              {groups.length > 0 ? (
                <TableRow>
                  <TableHeader colSpan={3} scope="colgroup">
                    <span className={styles.visuallyHidden}>Person</span>
                  </TableHeader>
                  {shared.length > 0 ? (
                    <TableHeader colSpan={shared.length} scope="colgroup">
                      Shared
                    </TableHeader>
                  ) : null}
                  {groups.map((g) => (
                    <TableHeader key={g.name} colSpan={g.columns.length} scope="colgroup">
                      {g.name}
                    </TableHeader>
                  ))}
                  <TableHeader scope="colgroup">
                    <span className={styles.visuallyHidden}>Where found</span>
                  </TableHeader>
                </TableRow>
              ) : null}
              <TableRow>
                {tableHeaders.map((header) => {
                  const { key, ...headerProps } = getHeaderProps({ header, isSortable: false });
                  return (
                    <TableHeader key={key} {...headerProps}>
                      {header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => {
                const person = byId.get(row.id);
                if (!person) return null;
                const { key, ...rowProps } = getRowProps({ row });
                return (
                  <TableRow
                    key={key}
                    {...rowProps}
                    className={isNew(person.id) ? styles.arrived : undefined}
                  >
                    <TableCell>
                      <span className={styles.name} data-name>
                        {person.name}
                      </span>
                      {person.isMatch ? (
                        <span className={styles.matched}>
                          <CheckmarkFilled aria-hidden="true" className={styles.matchedIcon} />
                          <span>Match</span>
                          {person.profileGroup ? (
                            <span className={styles.matchedGroup}>{person.profileGroup}</span>
                          ) : null}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Contact person={person} />
                    </TableCell>
                    <TableCell>
                      <span className={styles.company}>{person.company ?? '—'}</span>
                      {person.title ? <span className={styles.muted}>{person.title}</span> : null}
                    </TableCell>
                    {all.map((column) => (
                      <TableCell key={column.id}>
                        <VerdictCell
                          cell={person.verdicts[column.id] ?? NOT_CHECKED}
                          column={column}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Source person={person} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}

/**
 * A people search's results beside the chat: one row per person in arrival order, a Match, Miss
 * or Unclear tag per requirement (grouped by profile group), filling in live as the AI works.
 */
export function SearchResultsPanel({
  searchId,
  onClose,
}: {
  searchId: string;
  onClose: () => void;
}) {
  const query = useSearch(searchId);
  useSearchStream(searchId);
  const stop = useStopSearch(searchId);
  const titleId = useId();
  const toggleId = useId();
  const [matchesOnly, setMatchesOnly] = useState(false);
  // Who was already there when the panel opened: only later arrivals get the highlight.
  const [firstSeen, setFirstSeen] = useState<Set<string> | null>(null);
  const search = query.data;
  if (search && firstSeen === null) setFirstSeen(new Set(search.people.map((p) => p.id)));

  const running = search?.status === 'running';
  const groups = search ? groupProgressText(search) : null;
  const matchCount = search?.progress.matches ?? 0;
  const shownCount = search ? search.people.filter((p) => !matchesOnly || p.isMatch).length : 0;

  return (
    <aside className={styles.panel} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>People search</p>
          <h2 id={titleId} className={styles.title}>
            Search results
          </h2>
          {search ? (
            <p className={styles.subtitle}>
              {`${running ? 'Searching for' : 'Looked for'} ${search.target} ` +
                `${search.target === 1 ? 'person' : 'people'} · ${search.progress.matches} found`}
            </p>
          ) : null}
        </div>
        <IconButton kind="ghost" size="sm" align="bottom-end" label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </header>

      {!search ? (
        query.isError ? (
          <div className={styles.body}>
            <ErrorState
              title="The results didn’t load"
              message={toUserMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          </div>
        ) : (
          <div className={styles.body} aria-busy="true">
            <DataTableSkeleton
              columnCount={5}
              rowCount={4}
              showHeader={false}
              showToolbar={false}
            />
          </div>
        )
      ) : (
        <>
          <div className={styles.body}>
            <div className={styles.toolbar}>
              <AIExplainLabel aria-label="AI judged" />
              <Toggle
                id={toggleId}
                size="sm"
                labelText="Matches only"
                hideLabel
                toggled={matchesOnly}
                onToggle={setMatchesOnly}
              />
            </div>
            {shownCount === 0 ? (
              <p className={styles.empty}>
                {matchesOnly
                  ? 'No matches yet.'
                  : running
                    ? 'No one yet. People show here as they’re found.'
                    : 'No one was found.'}
              </p>
            ) : (
              <ResultsTable
                search={search}
                matchesOnly={matchesOnly}
                isNew={(id) => firstSeen !== null && !firstSeen.has(id)}
                titleId={titleId}
              />
            )}
          </div>
          <footer className={styles.footer}>
            <p className={styles.footerLine}>
              {`${matchCount === 1 ? '1 match' : `${matchCount} matches`} · ` +
                `${checkedCount(search)} checked`}
            </p>
            {groups ? <p className={styles.footerLine}>{groups}</p> : null}
            <p className={styles.muted}>
              {running ? `${dollars(search.cost.totalDollars)} so far` : costText(search.cost)}
            </p>
            {running ? (
              <Button
                kind="danger--ghost"
                size="sm"
                className={styles.stop}
                disabled={stop.isPending || stop.isSuccess}
                onClick={() => stop.mutate()}
              >
                {stop.isPending || stop.isSuccess ? 'Stopping…' : 'Stop'}
              </Button>
            ) : null}
          </footer>
        </>
      )}
    </aside>
  );
}
