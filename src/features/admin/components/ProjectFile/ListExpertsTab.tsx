'use client';

import { useEffect } from 'react';
import {
  DataTableSkeleton,
  Link as CarbonLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { AsyncBoundary } from '@/shared/ui';
import { useLeadList } from '../../api/queries';
import { CONNECTION_LABELS, CONNECTION_TAG } from '../../model/leadList.schema';
import type { Project } from '../../model/project.schema';
import { Avatar } from '../Inbox/SenderConversations';
import { ListFollowUp } from './ListFollowUp';
import styles from './ExpertsTab.module.scss';
import list from './ListExpertsTab.module.scss';

const HEADERS = ['Expert', 'Role', 'Company', 'Location', 'LinkedIn'] as const;

/**
 * Experts tab of a project built on a GetSales lead list: the list's people, with whether we're
 * connected to them on LinkedIn. Briefs will become lists; this is how their experts show.
 */
export function ListExpertsTab({
  leadList,
  questions,
  onFound,
}: {
  leadList: NonNullable<Project['leadList']>;
  /** The project's screening questions: what interested replies get, if the follow-up is on. */
  questions: string[];
  /** How many experts the list has (for the tab's count). */
  onFound: (count: number) => void;
}) {
  const query = useLeadList(leadList.uuid);
  const count = query.data?.members.length;

  useEffect(() => {
    if (count !== undefined) onFound(count);
  }, [count, onFound]);

  return (
    <section className={styles.root} aria-labelledby="experts-title">
      <div className={styles.header}>
        <h2 id="experts-title" className={styles.title}>
          Experts
        </h2>
        <p className={styles.status}>
          {count === undefined
            ? `From the LinkedIn list ${leadList.name}.`
            : `${count} ${count === 1 ? 'expert' : 'experts'} from the LinkedIn list ${leadList.name}.`}
        </p>
      </div>

      <ListFollowUp listUuid={leadList.uuid} questions={questions} />

      <AsyncBoundary
        query={query}
        errorTitle="The experts didn’t load"
        loading={
          <DataTableSkeleton
            aria-label="Loading experts"
            headers={HEADERS.map((header) => ({ key: header, header }))}
            columnCount={HEADERS.length}
            rowCount={6}
            showHeader={false}
            showToolbar={false}
          />
        }
        isEmpty={(data) => data.members.length === 0}
        empty={
          <p className={styles.status} role="status">
            No one is in {leadList.name} yet. People added to the list show up here.
          </p>
        }
      >
        {(data) => (
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
                {data.members.map(({ lead, position, location, connection }) => (
                  <TableRow key={lead.uuid} className={styles.row}>
                    <TableCell>
                      <span className={list.person}>
                        <Avatar name={lead.name} url={lead.avatarUrl} size="sm" />
                        {lead.linkedinUrl ? (
                          <CarbonLink href={lead.linkedinUrl} target="_blank" rel="noreferrer">
                            {lead.name}
                          </CarbonLink>
                        ) : (
                          lead.name
                        )}
                      </span>
                    </TableCell>
                    <TableCell className={list.role}>{position ?? lead.headline ?? '—'}</TableCell>
                    <TableCell>{lead.company ?? '—'}</TableCell>
                    <TableCell>{location ?? '—'}</TableCell>
                    <TableCell>
                      <Tag size="md" type={CONNECTION_TAG[connection]}>
                        {CONNECTION_LABELS[connection]}
                      </Tag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AsyncBoundary>
    </section>
  );
}
