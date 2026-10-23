'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionItem,
  Button,
  ContentSwitcher,
  DataTable,
  InlineNotification,
  Pagination,
  ProgressBar,
  Search,
  SkeletonText,
  Switch,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  DismissibleTag,
  Tag,
} from '@carbon/react';
import { ArrowRight, Pin, Subtract } from '@carbon/icons-react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatRelative } from '@/shared/lib/dates';
import { AsyncBoundary, NotFoundState, PageHeader, StatusTag } from '@/shared/ui';
import { useGenerateShortlist, useMatches, usePatchMatch, useProject } from '../../api/queries';
import { type MatchResult, type MatchedExpert, type ShortlistSize } from '../../model/match.schema';
import { PROJECT_STATUS_LABELS, type Project } from '../../model/project.schema';
import { ProjectSteps } from '../ProjectSteps/ProjectSteps';
import styles from './MatchedExperts.module.scss';

const PAGE_SIZES = [7, 14, 21];
const HEADERS = [
  { key: 'expert', header: 'Expert' },
  { key: 'role', header: 'Relevant role' },
  { key: 'years', header: 'Yrs' },
  { key: 'country', header: 'Country' },
  { key: 'match', header: 'Match' },
  { key: 'lastEngaged', header: 'Last engaged' },
];

/** PRD screen 04: the AI's matched experts table after the brief is approved. */
export function MatchedExperts({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  return (
    <AsyncBoundary
      query={project}
      errorTitle="This project didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that project"
          message="It may have been deleted, or the link is incomplete."
          backHref={routes.admin.projects}
          backLabel="Back to projects"
        />
      }
      loading={
        <div aria-busy="true" aria-label="Loading matched experts" className={styles.root}>
          <SkeletonText heading width="50%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {(data) => <MatchedExpertsView project={data} />}
    </AsyncBoundary>
  );
}

function MatchedExpertsView({ project }: { project: Project }) {
  const matches = useMatches(project.id);
  return (
    <div className={styles.root}>
      <PageHeader
        breadcrumbs={[
          { label: 'Projects', href: routes.admin.projects },
          { label: project.id, href: routes.admin.project(project.id) },
        ]}
        title={project.name}
        eyebrow={
          <div className={styles.briefMeta}>
            <Tag type="outline" size="sm">
              {project.id}
            </Tag>
            <StatusTag tone="progress" label={PROJECT_STATUS_LABELS[project.status]} size="sm" />
            {project.approvedAt ? (
              <span>Approved · {formatRelative(project.approvedAt)}</span>
            ) : null}
          </div>
        }
        subtitle={`Client: ${project.client.name} · Contact: ${project.contact.name}`}
      />
      <ProjectSteps projectId={project.id} status={project.status} />
      <section className={styles.briefCard} aria-label="Project brief summary">
        <Accordion align="start" size="md">
          <AccordionItem title="Project brief" open>
            <AIExplainLabel aria-label="Project brief" />
            <p>{project.brief}</p>
          </AccordionItem>
        </Accordion>
      </section>
      <AsyncBoundary
        query={matches}
        errorTitle="Matched experts didn’t load"
        loading={
          <div aria-busy="true" aria-label="Searching the expert network">
            <SkeletonText heading width="40%" />
            <SkeletonText paragraph lineCount={6} />
          </div>
        }
      >
        {(data) => <MatchesPanel project={project} matches={data} />}
      </AsyncBoundary>
    </div>
  );
}

function MatchesPanel({ project, matches }: { project: Project; matches: MatchResult }) {
  const router = useRouter();
  const patch = usePatchMatch(project.id);
  const generate = useGenerateShortlist(project.id);
  const [size, setSize] = useState<ShortlistSize>(10);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0] ?? 7);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(matches.filters);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.experts.filter((expert) => {
      if (expert.excluded) return false;
      if (q) {
        const hay = `${expert.label} ${expert.role} ${expert.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches.experts, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageIndex = Math.min(page, pageCount);
  const slice = visible.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
  const rows = slice.map((expert) => ({
    id: expert.id,
    expert: expert.label,
    role: expert.role,
    years: String(expert.years),
    country: expert.country,
    match: `${expert.matchPercent}%`,
    lastEngaged: expert.lastEngagedAt ? formatRelative(expert.lastEngagedAt) : 'Never',
    raw: expert,
  }));
  const byId = new Map(slice.map((e) => [e.id, e]));

  const runGenerate = () => {
    setError(null);
    generate.mutate(
      { size },
      {
        onSuccess: () => router.push(routes.admin.projectStep(project.id, 'shortlist')),
        onError: (err) => setError(err),
      },
    );
  };

  const patchExperts = (ids: string[], change: { pinned?: boolean; excluded?: boolean }) => {
    const run = async () => {
      for (const expertId of ids) {
        await patch.mutateAsync({ expertId, ...change });
      }
      setNotice(
        change.excluded
          ? `Excluded ${ids.length} expert${ids.length === 1 ? '' : 's'}.`
          : `Pinned ${ids.length} expert${ids.length === 1 ? '' : 's'} to the shortlist.`,
      );
    };
    void run().catch((err: unknown) => setError(err));
  };

  return (
    <section aria-labelledby="matches-heading">
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <p className={styles.searched}>
            AI searched {matches.searchedCount.toLocaleString()} experts ·{' '}
            {(matches.durationMs / 1000).toFixed(1)}s
          </p>
          <h2 id="matches-heading" className={styles.heading}>
            {visible.length.toLocaleString()} experts match this project
          </h2>
          <div className={styles.filters}>
            <span className={styles.filterLabel}>Matched on</span>
            {activeFilters.map((filter) => (
              <DismissibleTag
                key={filter}
                type="outline"
                size="sm"
                text={filter}
                title={`Remove “${filter}”`}
                dismissTooltipLabel={`Remove “${filter}”`}
                onClose={() => setActiveFilters((prev) => prev.filter((f) => f !== filter))}
              />
            ))}
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <ContentSwitcher
            size="md"
            selectedIndex={[10, 20, 30].indexOf(size)}
            onChange={({ index }) => {
              const next = index === undefined ? 10 : (([10, 20, 30] as const)[index] ?? 10);
              setSize(next);
            }}
          >
            <Switch name="10" text="Top 10" />
            <Switch name="20" text="Top 20" />
            <Switch name="30" text="Top 30" />
          </ContentSwitcher>
          <Button
            renderIcon={ArrowRight}
            disabled={generate.isPending || visible.length === 0}
            onClick={runGenerate}
          >
            {generate.isPending ? 'Generating…' : `Generate Top ${size} shortlist`}
          </Button>
        </div>
      </div>

      {notice ? (
        <InlineNotification
          kind="success"
          lowContrast
          title={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t work."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      <div className={styles.searchRow}>
        <Search
          size="md"
          labelText="Search experts"
          placeholder="Search name, role or country"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          closeButtonLabelText="Clear search"
        />
      </div>

      <div className={styles.tableWrap}>
        <DataTable rows={rows} headers={HEADERS} isSortable={false}>
          {({
            rows: tableRows,
            headers,
            selectedRows,
            getHeaderProps,
            getRowProps,
            getSelectionProps,
            getToolbarProps,
            getBatchActionProps,
            getTableProps,
            getTableContainerProps,
          }) => {
            const batch = getBatchActionProps();
            const selectedIds = selectedRows.map((row) => row.id);
            return (
              <TableContainer {...getTableContainerProps()} title="" description="">
                <TableToolbar {...getToolbarProps()}>
                  <TableBatchActions {...batch}>
                    <TableBatchAction
                      tabIndex={batch.shouldShowBatchActions ? 0 : -1}
                      renderIcon={Pin}
                      onClick={() => {
                        patchExperts(selectedIds, { pinned: true });
                        batch.onCancel();
                      }}
                    >
                      Pin to shortlist
                    </TableBatchAction>
                    <TableBatchAction
                      tabIndex={batch.shouldShowBatchActions ? 0 : -1}
                      renderIcon={Subtract}
                      onClick={() => {
                        patchExperts(selectedIds, { excluded: true });
                        batch.onCancel();
                      }}
                    >
                      Exclude
                    </TableBatchAction>
                  </TableBatchActions>
                  <TableToolbarContent>
                    {selectedRows.length > 0 ? (
                      <span className={styles.searched}>
                        {selectedRows.length} selected. Pinned experts are always kept in the
                        shortlist.
                      </span>
                    ) : null}
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()} aria-label="Matched experts" size="md">
                  <TableHead>
                    <TableRow>
                      <TableSelectAll {...getSelectionProps()} />
                      {headers.map((header) => {
                        const { key, ...rest } = getHeaderProps({ header });
                        return (
                          <TableHeader
                            key={key}
                            {...rest}
                            className={
                              header.key === 'years' || header.key === 'country'
                                ? styles.fromMd
                                : undefined
                            }
                          >
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => {
                      const expert = byId.get(row.id) as MatchedExpert | undefined;
                      const { key: rowKey, ...rowProps } = getRowProps({ row });
                      return (
                        <TableRow key={rowKey} {...rowProps}>
                          <TableSelectRow {...getSelectionProps({ row })} />
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'expert') {
                              return (
                                <TableCell key={cell.id}>
                                  <div className={styles.expertCell}>
                                    <span className={styles.avatar} aria-hidden="true">
                                      {expert?.label.replace(/\D/g, '').slice(-2) ?? '·'}
                                    </span>
                                    <span>
                                      {cell.value}
                                      {expert?.pinned ? (
                                        <>
                                          {' '}
                                          <Tag type="blue" size="sm">
                                            Pinned
                                          </Tag>
                                        </>
                                      ) : null}
                                    </span>
                                  </div>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'match') {
                              return (
                                <TableCell key={cell.id}>
                                  <div className={styles.matchCell}>
                                    <span className={styles.matchValue}>{cell.value}</span>
                                    <ProgressBar
                                      label={`${expert?.matchPercent ?? 0} percent match`}
                                      hideLabel
                                      value={expert?.matchPercent ?? 0}
                                      size="small"
                                    />
                                  </div>
                                </TableCell>
                              );
                            }
                            const hide =
                              cell.info.header === 'years' || cell.info.header === 'country';
                            return (
                              <TableCell key={cell.id} className={hide ? styles.fromMd : undefined}>
                                {cell.value}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          }}
        </DataTable>
      </div>

      <Pagination
        page={pageIndex}
        pageSize={pageSize}
        pageSizes={PAGE_SIZES}
        totalItems={visible.length}
        onChange={({ page: nextPage, pageSize: nextSize }) => {
          setPage(nextPage);
          setPageSize(nextSize);
        }}
        itemsPerPageText="Experts per page"
        pageRangeText={(_current, total) => `of ${total} page${total === 1 ? '' : 's'}`}
        itemRangeText={(min, max, total) => `${min}–${max} of ${total}`}
      />
    </section>
  );
}
