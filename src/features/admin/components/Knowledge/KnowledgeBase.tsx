'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, ComboBox, Dropdown, Search, SkeletonText, Tag } from '@carbon/react';
import { Add, ArrowUpRight, Information } from '@carbon/icons-react';
import { Report } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState } from '@/shared/ui';
import { useReports } from '../../api/queries';
import type { CallDetail } from '../../model/calls.schema';
import { SentToast } from '../Calls/SentToast';
import { Avatar, longDateOf } from '../Calls/callParts';
import styles from './Knowledge.module.scss';

type Sort = 'newest' | 'oldest';
const SORTS: { id: Sort; text: string }[] = [
  { id: 'newest', text: 'Newest first' },
  { id: 'oldest', text: 'Oldest first' },
];

/**
 * Knowledge base: every research report the calls have produced, in one place. Search reaches
 * into what the experts said, not just titles, and shows the sentence it found. Open a report
 * to read it in full.
 */
export function KnowledgeBase() {
  const [soon, setSoon] = useState(false);
  const reports = useReports();
  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>Knowledge base</h1>
          <p className={styles.subtitle}>
            {reports.data
              ? `${reports.data.length} research ${reports.data.length === 1 ? 'report' : 'reports'} from expert calls`
              : 'Research reports from expert calls'}
          </p>
        </div>
        {/* The page's main action, at the top right; search lives with the filters. */}
        <div className={styles.headerActions}>
          {/* Not designed yet: says so instead of doing nothing. */}
          <Button size="md" renderIcon={Add} onClick={() => setSoon(true)}>
            Add new research
          </Button>
        </div>
      </header>
      <AsyncBoundary
        query={reports}
        errorTitle="The knowledge base didn’t load"
        loading={
          <div className={styles.panel} aria-busy="true" aria-label="Loading reports">
            <SkeletonText paragraph lineCount={10} />
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            pictogram={<Report aria-hidden="true" />}
            title="No reports yet"
            description="When a call ends, the AI writes up what the expert said and files the report here."
          />
        }
      >
        {(data) => <ReportList reports={data} />}
      </AsyncBoundary>
      {soon ? (
        <SentToast
          title="Adding research is coming soon"
          detail="For now, every completed call files its report here."
          icon={<Information size={20} />}
          tone="info"
          onClose={() => setSoon(false)}
        />
      ) : null}
    </div>
  );
}

/** Everything a search can reach in one report, labelled by where it came from. */
function searchable(report: CallDetail): string[] {
  return [
    report.projectName,
    report.expert.name,
    report.expert.detail,
    report.client.name,
    report.client.detail,
    report.purpose,
    ...report.takeaways,
    ...report.questions.flatMap((q) => [q.text, q.answer ?? '']),
  ].filter(Boolean);
}

/** The text with each match of the query marked. */
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className={styles.mark}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function ReportList({ reports }: { reports: CallDetail[] }) {
  const [query, setQuery] = useState('');
  const [project, setProject] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const q = query.trim().toLowerCase();

  const projects = [...new Map(reports.map((r) => [r.projectId, r.projectName])).entries()]
    .map(([id, text]) => ({ id, text }))
    .sort((a, b) => a.text.localeCompare(b.text));

  const shown = reports
    .filter((r) => !project || r.projectId === project)
    .filter((r) => !q || searchable(r).some((text) => text.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === 'newest'
        ? b.startsAt.localeCompare(a.startsAt)
        : a.startsAt.localeCompare(b.startsAt),
    );

  return (
    <section className={styles.listArea} aria-label="Reports">
      {/* One white panel, as on Experts: search and filters, then the cards. */}
      <div className={styles.filterPanel}>
        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            {/* A visible label, like the filters beside it; the field keeps its own for readers. */}
            <span className={styles.searchLabel} aria-hidden="true">
              Search
            </span>
            <Search
              size="md"
              labelText="Search reports"
              placeholder="Search reports, answers and experts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ComboBox
            id="knowledge-project"
            titleText="Project"
            placeholder="Search projects"
            size="md"
            className={styles.filter}
            items={projects}
            itemToString={(item) => item?.text ?? ''}
            itemToElement={(item) => (
              <span className={styles.option}>
                <span>{item.text}</span>
                <span className={styles.optionCount}>
                  {reports.filter((r) => r.projectId === item.id).length}
                </span>
              </span>
            )}
            shouldFilterItem={({ item, inputValue }) =>
              !inputValue || item.text.toLowerCase().includes(inputValue.trim().toLowerCase())
            }
            selectedItem={projects.find((p) => p.id === project) ?? null}
            onChange={({ selectedItem }) => setProject(selectedItem?.id ?? null)}
          />
          <div className={styles.sort}>
            <Dropdown
              id="knowledge-sort"
              titleText="Sort by"
              label="Sort by"
              type="inline"
              size="md"
              items={SORTS}
              itemToString={(item) => item?.text ?? ''}
              selectedItem={SORTS.find((s) => s.id === sort) ?? null}
              onChange={({ selectedItem }) => selectedItem && setSort(selectedItem.id)}
            />
          </div>
        </div>

        <p className={styles.count} aria-live="polite">
          {q || project
            ? `${shown.length} of ${reports.length} reports match`
            : `${reports.length} reports`}
        </p>

        {shown.length === 0 ? (
          <p className={styles.none}>
            No reports match. Try other words: search reads the experts’ answers too.
          </p>
        ) : (
          <ul className={styles.grid}>
            {shown.map((report) => (
              <ReportCard key={report.id} report={report} query={query} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReportCard({ report, query }: { report: CallDetail; query: string }) {
  const q = query.trim().toLowerCase();
  // The description: the line the search found, or the report's first finding.
  const hit = q
    ? [...report.takeaways, ...report.questions.map((x) => x.answer ?? ''), report.purpose].find(
        (text) => text.toLowerCase().includes(q),
      )
    : undefined;
  const description = hit ?? report.takeaways[0] ?? report.purpose;
  const people = [
    { ...report.expert, role: 'Expert' },
    { ...report.client, role: 'Client' },
    { ...report.moderator, role: 'Moderator' },
  ];

  return (
    <li className={styles.cardItem}>
      <Link href={routes.admin.report(report.id)} className={styles.card}>
        {/* Heading, with the open button at the top right. */}
        <span className={styles.cardHead}>
          <span className={styles.cardTitle}>{highlight(report.projectName, query)}</span>
          <span className={styles.open} aria-hidden="true">
            <ArrowUpRight size={16} />
          </span>
        </span>

        {/* Under the heading: whether it went to the client, and the industry. */}
        <span className={styles.chips}>
          {report.followUpsSentAt ? (
            <Tag type="green" size="sm" className={styles.chip}>
              Sent to client
            </Tag>
          ) : (
            <Tag type="warm-gray" size="sm" className={styles.chip}>
              Not sent yet
            </Tag>
          )}
          {/* Never an empty chip: data without an industry shows the status alone. */}
          {report.industry ? (
            <Tag type="outline" size="sm" className={styles.chip}>
              {report.industry}
            </Tag>
          ) : null}
        </span>

        <span className={styles.description}>{highlight(description, query)}</span>

        {/* Footer: when, on the left; the people on the call, on the right. */}
        <span className={styles.cardFoot}>
          <span className={styles.footDate}>{longDateOf(report.startsAt)}</span>
          <span className={styles.faces}>
            {people.map((person) => (
              <span
                key={person.role}
                className={styles.face}
                title={`${person.name}, ${person.role}`}
              >
                <Avatar name={person.name} photoUrl={person.photoUrl} size={24} />
              </span>
            ))}
          </span>
        </span>
      </Link>
    </li>
  );
}
