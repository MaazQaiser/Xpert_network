'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Dropdown, SkeletonPlaceholder, SkeletonText, Tag } from '@carbon/react';
import { Microphone, Money, Time } from '@carbon/icons-react';
import { Magnify, Microphone as MicrophonePictogram } from '@carbon/pictograms-react';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { formatMinutes, formatUsd } from '@/shared/lib/money';
import { AsyncBoundary, EmptyState, PageHeader, StatusTag } from '@/shared/ui';
import { useCalls } from '../../api/queries';
import {
  FEE_FLOORS,
  filtersFromParams,
  filtersToParams,
  hasCallFilters,
  MATCH_LABELS,
  matchesCallFilters,
  MODE_LABELS,
  sortCalls,
  TIME_CAPS,
  type CallFilters,
  type OpenCall,
} from '../../model/call.schema';
import { APPLICATION_STATUS, MATCH_TAG } from '../callDisplay';
import styles from './CallsBrowser.module.scss';

const ANY = 'any';

/** F8: interview requests, grouped by industry, strongest match first. */
export function CallsBrowser() {
  return (
    <div className={styles.root}>
      <PageHeader
        title="Interview requests"
        subtitle="Each request shows its industry and category. Open one to join a one-to-one interview."
      />
      <Suspense>
        <Browser />
      </Suspense>
    </div>
  );
}

function Browser() {
  const calls = useCalls();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = filtersFromParams(new URLSearchParams(params.toString()));

  const navigate = (next: CallFilters) => {
    const search = filtersToParams(next).toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  return (
    <AsyncBoundary
      query={calls}
      errorTitle="Interview requests didn’t load"
      loading={<CallsSkeleton />}
      isEmpty={(data) => data.length === 0}
      empty={
        <EmptyState
          pictogram={<MicrophonePictogram aria-hidden="true" />}
          title="No interview requests right now"
          description="New requests are published most weekdays. Topics and regions on your profile decide which ones you see first."
          action={
            <Button as={Link} href={routes.expert.profile} kind="tertiary">
              Review your expertise
            </Button>
          }
        />
      }
    >
      {(data) => <CallsList calls={data} filters={filters} onFilter={navigate} />}
    </AsyncBoundary>
  );
}

function CallsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading interview requests" className={styles.list}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.card}>
          <SkeletonText width="30%" />
          <SkeletonText heading width="70%" />
          <SkeletonText paragraph lineCount={2} />
          <SkeletonPlaceholder className={styles.skeletonMeta} />
        </div>
      ))}
    </div>
  );
}

function CallsList({
  calls,
  filters,
  onFilter,
}: {
  calls: OpenCall[];
  filters: CallFilters;
  onFilter: (next: CallFilters) => void;
}) {
  const industries = [...new Map(calls.map((c) => [c.industry.id, c.industry.label])).entries()];
  const regions = [
    ...new Map(calls.flatMap((c) => c.regions.map((r) => [r.id, r.label] as const))).entries(),
  ];
  const visible = sortCalls(calls.filter((call) => matchesCallFilters(call, filters)));
  const groups = groupByIndustry(visible);
  const isFiltered = hasCallFilters(filters);
  const clear = () => onFilter({ industry: null, region: null, minFee: null, maxMinutes: null });

  return (
    <>
      <section className={styles.filters} aria-label="Filter interview requests">
        <Dropdown
          id="calls-industry"
          titleText="Industry"
          label="All industries"
          items={[ANY, ...industries.map(([id]) => id)]}
          itemToString={(id: string | null) =>
            !id || id === ANY ? 'All industries' : (industries.find(([i]) => i === id)?.[1] ?? id)
          }
          selectedItem={filters.industry ?? ANY}
          onChange={({ selectedItem }: { selectedItem: string | null }) =>
            onFilter({
              ...filters,
              industry: selectedItem && selectedItem !== ANY ? selectedItem : null,
            })
          }
        />
        <Dropdown
          id="calls-region"
          titleText="Region"
          label="All regions"
          items={[ANY, ...regions.map(([id]) => id)]}
          itemToString={(id: string | null) =>
            !id || id === ANY ? 'All regions' : (regions.find(([r]) => r === id)?.[1] ?? id)
          }
          selectedItem={filters.region ?? ANY}
          onChange={({ selectedItem }: { selectedItem: string | null }) =>
            onFilter({
              ...filters,
              region: selectedItem && selectedItem !== ANY ? selectedItem : null,
            })
          }
        />
        <Dropdown
          id="calls-fee"
          titleText="Fee"
          label="Any fee"
          items={[ANY, ...FEE_FLOORS.map(String)]}
          itemToString={(v: string | null) =>
            !v || v === ANY ? 'Any fee' : `${formatUsd(Number(v))} or more`
          }
          selectedItem={filters.minFee ? String(filters.minFee) : ANY}
          onChange={({ selectedItem }: { selectedItem: string | null }) =>
            onFilter({
              ...filters,
              minFee: selectedItem && selectedItem !== ANY ? Number(selectedItem) : null,
            })
          }
        />
        <Dropdown
          id="calls-time"
          titleText="Time"
          label="Any length"
          items={[ANY, ...TIME_CAPS.map(String)]}
          itemToString={(v: string | null) =>
            !v || v === ANY ? 'Any length' : `Up to ${formatMinutes(Number(v))}`
          }
          selectedItem={filters.maxMinutes ? String(filters.maxMinutes) : ANY}
          onChange={({ selectedItem }: { selectedItem: string | null }) =>
            onFilter({
              ...filters,
              maxMinutes: selectedItem && selectedItem !== ANY ? Number(selectedItem) : null,
            })
          }
        />
      </section>

      <div className={styles.resultsBar}>
        <p className={styles.count} role="status">
          {isFiltered
            ? `${visible.length} of ${calls.length} requests`
            : `${calls.length} requests`}
        </p>
        {isFiltered ? (
          <Button kind="ghost" size="sm" onClick={clear}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          headingLevel={2}
          pictogram={<Magnify aria-hidden="true" />}
          title="No requests match these filters"
          description="Try a wider fee or time range, or clear the filters to see every request."
          action={
            <Button kind="tertiary" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.industry} className={styles.group} aria-labelledby={group.id}>
              <h2 id={group.id} className={styles.groupTitle}>
                {group.industry}
              </h2>
              <ul className={styles.list} aria-label={`${group.industry} requests`}>
                {group.calls.map((call) => (
                  <li key={call.id}>
                    <CallCard call={call} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function CallCard({ call }: { call: OpenCall }) {
  const application = call.application ? APPLICATION_STATUS[call.application.status] : null;
  return (
    <article className={styles.card}>
      <div className={styles.tags}>
        <Tag type={MATCH_TAG[call.match.level]} size="md">
          {MATCH_LABELS[call.match.level]}
        </Tag>
        {call.evergreen ? (
          <Tag type="purple" size="md">
            Evergreen
          </Tag>
        ) : null}
        {application ? <StatusTag tone={application.tone} label={application.label} /> : null}
      </div>
      <p className={styles.facets}>
        <span>Industry {call.industry.label}</span>
        <span>Category {call.topics.join(' · ')}</span>
      </p>
      <h2 className={styles.title}>
        <Link href={routes.expert.session(call.id)} className={styles.link}>
          {call.title}
        </Link>
      </h2>
      <p className={styles.brief}>{call.brief}</p>
      <p className={styles.reason}>{call.match.reasons[0]}</p>
      <ul className={styles.meta} aria-label="Call details">
        <li>
          <Money size={16} aria-hidden="true" />
          <strong>{formatUsd(call.feeUsd)}</strong>
        </li>
        <li>
          <Time size={16} aria-hidden="true" />
          {formatMinutes(call.estMinutes)}
        </li>
        <li>
          <Microphone size={16} aria-hidden="true" />
          {MODE_LABELS[call.mode]}
        </li>
        <li>{call.deadline ? `Closes ${formatDate(call.deadline)}` : 'No deadline'}</li>
      </ul>
      <Link href={routes.expert.call(call.id)} className={styles.details}>
        Details
      </Link>
    </article>
  );
}

/** Industries in the order their strongest request appears. */
function groupByIndustry(calls: OpenCall[]): { id: string; industry: string; calls: OpenCall[] }[] {
  const groups: { id: string; industry: string; calls: OpenCall[] }[] = [];
  for (const call of calls) {
    const existing = groups.find((group) => group.industry === call.industry.label);
    if (existing) existing.calls.push(call);
    else
      groups.push({
        id: `industry-${call.industry.id}`,
        industry: call.industry.label,
        calls: [call],
      });
  }
  return groups;
}
