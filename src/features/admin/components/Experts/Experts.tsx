'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, ComboBox, Dropdown, Pagination, Search, SkeletonText, Tag } from '@carbon/react';
import { Add, ArrowRight, Information } from '@carbon/icons-react';
import { Teammates } from '@carbon/pictograms-react';
import { formatDate } from '@/shared/lib/dates';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, CountryFlag, EmptyState, countryName } from '@/shared/ui';
import { useNetworkExperts } from '../../api/queries';
import {
  NETWORK_SECTOR_LABELS,
  type NetworkExpert,
  type NetworkSector,
} from '../../model/network.schema';
import { SentToast } from '../Calls/SentToast';
import { Avatar } from '../Calls/callParts';
import styles from './Experts.module.scss';

type Option<T extends string> = { id: T; text: string };
type Sort = 'recent' | 'name' | 'years';

const ALL = 'all' as const;
const SECTORS: Option<NetworkSector>[] = (
  Object.keys(NETWORK_SECTOR_LABELS) as NetworkSector[]
).map((id) => ({ id, text: NETWORK_SECTOR_LABELS[id] }));

/** Type to narrow: matches anywhere in the option, ignoring case. */
function filterOptions({ item, inputValue }: { item: Option<string>; inputValue: string | null }) {
  return !inputValue || item.text.toLowerCase().includes(inputValue.trim().toLowerCase());
}
const COMPLIANCE: Option<'cleared' | 'pending' | typeof ALL>[] = [
  { id: ALL, text: 'Any' },
  { id: 'cleared', text: 'Cleared' },
  { id: 'pending', text: 'Pending' },
];
const SORTS: Option<Sort>[] = [
  { id: 'recent', text: 'Last worked with us' },
  { id: 'name', text: 'Name, A to Z' },
  { id: 'years', text: 'Most experienced' },
];

/**
 * Experts (F20): the Xpert Network database, and only that: the people who signed up and were
 * vetted, not the one-off LinkedIn or partner-API finds a project search brings in. Search and
 * filter, then open anyone for their full record.
 */
export function Experts() {
  const [soon, setSoon] = useState(false);
  const experts = useNetworkExperts();
  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>Experts</h1>
          <p className={styles.subtitle}>
            {experts.data
              ? `${experts.data.length} vetted experts in the Xpert Network database`
              : 'The Xpert Network database'}
          </p>
        </div>
        {/* The page's main action, at the top right; search lives with the filters. */}
        <div className={styles.headerActions}>
          {/* Not designed yet: says so instead of doing nothing. */}
          <Button size="md" renderIcon={Add} onClick={() => setSoon(true)}>
            Add new expert
          </Button>
        </div>
      </header>
      <AsyncBoundary
        query={experts}
        errorTitle="The expert database didn’t load"
        loading={
          <div className={styles.panel} aria-busy="true" aria-label="Loading experts">
            <SkeletonText paragraph lineCount={12} />
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            pictogram={<Teammates aria-hidden="true" />}
            title="No experts in the database yet"
            description="Experts join through the sign-up flow. Once they’re vetted, they show here and the AI can match them to projects."
          />
        }
      >
        {(data) => <Directory experts={data} />}
      </AsyncBoundary>
      {soon ? (
        <SentToast
          title="Adding experts is coming soon"
          detail="For now, experts join through the sign-up flow and vetting."
          icon={<Information size={20} />}
          tone="info"
          onClose={() => setSoon(false)}
        />
      ) : null}
    </div>
  );
}

function matches(expert: NetworkExpert, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [expert.name, expert.headline, ...expert.history.map((job) => job.org)]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function sorted(list: NetworkExpert[], sort: Sort): NetworkExpert[] {
  return [...list].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'years') return b.years - a.years || a.name.localeCompare(b.name);
    return (
      (b.lastEngagedAt ?? '').localeCompare(a.lastEngagedAt ?? '') || a.name.localeCompare(b.name)
    );
  });
}

function Directory({ experts }: { experts: NetworkExpert[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<NetworkSector | typeof ALL>(ALL);
  const [country, setCountry] = useState<string>(ALL);
  const [compliance, setCompliance] = useState<'cleared' | 'pending' | typeof ALL>(ALL);
  const [sort, setSort] = useState<Sort>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const countries: Option<string>[] = [...new Set(experts.map((e) => e.country))]
    .sort((a, b) => countryName(a).localeCompare(countryName(b)))
    .map((code) => ({ id: code, text: countryName(code) }));
  // How many experts each option holds, shown beside it in the menu.
  const perSector = (id: string) => experts.filter((e) => e.sector === id).length;
  const perCountry = (id: string) => experts.filter((e) => e.country === id).length;

  const shown = sorted(
    experts.filter(
      (e) =>
        matches(e, query) &&
        (sector === ALL || e.sector === sector) &&
        (country === ALL || e.country === country) &&
        (compliance === ALL || e.compliance === compliance),
    ),
    sort,
  );
  // A new search or filter starts again from the first page.
  const filterKey = [query, sector, country, compliance, sort].join('|');
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setPage(1);
  }
  const pageItems = shown.slice((page - 1) * pageSize, page * pageSize);
  const isFiltered =
    Boolean(query.trim()) || sector !== ALL || country !== ALL || compliance !== ALL;
  const clearAll = () => {
    setQuery('');
    setSector(ALL);
    setCountry(ALL);
    setCompliance(ALL);
  };

  return (
    <section className={styles.panel} aria-label="Expert database">
      <div className={styles.filters}>
        <div className={styles.searchField}>
          {/* A visible label, like the filters beside it; the field keeps its own for readers. */}
          <span className={styles.searchLabel} aria-hidden="true">
            Search
          </span>
          <Search
            size="md"
            labelText="Search experts"
            placeholder="Search by name, role or company"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {/* Searchable: type to narrow the list; clear it to show everyone again. */}
        <ComboBox
          id="experts-sector"
          titleText="Sector"
          placeholder="Search sectors"
          size="md"
          className={styles.filter}
          items={SECTORS}
          itemToString={(item) => item?.text ?? ''}
          itemToElement={(item) => (
            <span className={styles.option}>
              <span>{item.text}</span>
              <span className={styles.optionCount}>{perSector(item.id)}</span>
            </span>
          )}
          shouldFilterItem={filterOptions}
          selectedItem={SECTORS.find((s) => s.id === sector) ?? null}
          onChange={({ selectedItem }) => setSector(selectedItem?.id ?? ALL)}
        />
        <ComboBox
          id="experts-country"
          titleText="Country"
          placeholder="Search countries"
          size="md"
          className={styles.filter}
          items={countries}
          itemToString={(item) => item?.text ?? ''}
          itemToElement={(item) => (
            <span className={styles.option}>
              <CountryFlag code={item.id} />
              <span className={styles.optionCount}>{perCountry(item.id)}</span>
            </span>
          )}
          shouldFilterItem={filterOptions}
          selectedItem={countries.find((c) => c.id === country) ?? null}
          onChange={({ selectedItem }) => setCountry(selectedItem?.id ?? ALL)}
        />
        <Dropdown
          id="experts-compliance"
          titleText="Compliance"
          label="Compliance"
          size="md"
          className={styles.filter}
          items={COMPLIANCE}
          itemToString={(item) => item?.text ?? ''}
          selectedItem={COMPLIANCE.find((c) => c.id === compliance) ?? null}
          onChange={({ selectedItem }) => selectedItem && setCompliance(selectedItem.id)}
        />
        <div className={styles.sort}>
          <Dropdown
            id="experts-sort"
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
        {isFiltered ? (
          <>
            {shown.length} of {experts.length} experts match.{' '}
            <button type="button" className={styles.clear} onClick={clearAll}>
              Clear filters
            </button>
          </>
        ) : (
          `${experts.length} experts`
        )}
      </p>

      {shown.length === 0 ? (
        <div className={styles.noMatch}>
          <p className={styles.noMatchTitle}>No experts match.</p>
          <p className={styles.muted}>Try a broader search, or clear the filters.</p>
          <Button kind="tertiary" size="sm" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table} aria-label="Experts">
              <thead>
                <tr>
                  <th scope="col">Expert</th>
                  <th scope="col" className={styles.wider}>
                    Sector
                  </th>
                  <th scope="col">Country</th>
                  <th scope="col" className={styles.wide}>
                    Experience
                  </th>
                  <th scope="col" className={styles.wide}>
                    Rate
                  </th>
                  <th scope="col" className={styles.wider}>
                    Last worked with us
                  </th>
                  <th scope="col" className={styles.wide}>
                    Compliance
                  </th>
                  <th scope="col" className={styles.arrowCol}>
                    <span className="cds--visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((expert) => (
                  <tr
                    key={expert.id}
                    className={styles.row}
                    onClick={() => router.push(routes.admin.expert(expert.id))}
                  >
                    <th scope="row" className={styles.who}>
                      <Avatar name={expert.name} photoUrl={expert.photoUrl} />
                      <span className={styles.whoText}>
                        <Link
                          href={routes.admin.expert(expert.id)}
                          className={styles.name}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {expert.name}
                        </Link>
                        <span className={styles.headline}>{expert.headline}</span>
                      </span>
                    </th>
                    <td className={styles.wider}>{NETWORK_SECTOR_LABELS[expert.sector]}</td>
                    <td>
                      <CountryFlag code={expert.country} short />
                    </td>
                    <td className={styles.wide}>{expert.years} years</td>
                    <td className={`${styles.wide} ${styles.rate}`}>
                      {expert.rateHint ? `${expert.rateHint}/h` : '—'}
                    </td>
                    <td className={styles.wider}>
                      {expert.lastEngagedAt ? (
                        formatDate(expert.lastEngagedAt)
                      ) : (
                        <span className={styles.muted}>Not yet</span>
                      )}
                    </td>
                    <td className={styles.wide}>
                      {expert.compliance === 'cleared' ? (
                        <Tag type="green" size="sm">
                          Cleared
                        </Tag>
                      ) : (
                        <Tag type="warm-gray" size="sm">
                          Pending
                        </Tag>
                      )}
                    </td>
                    <td className={styles.arrowCol}>
                      <ArrowRight aria-hidden={true} className={styles.arrow} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > 20 ? (
            <Pagination
              className={styles.pagination}
              page={page}
              pageSize={pageSize}
              pageSizes={[20, 50]}
              totalItems={shown.length}
              itemsPerPageText="Per page"
              onChange={({ page: next, pageSize: size }) => {
                setPage(next);
                setPageSize(size);
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
