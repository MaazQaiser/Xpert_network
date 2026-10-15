'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Checkbox,
  ContentSwitcher,
  DismissibleTag,
  Dropdown,
  Search,
  SkeletonPlaceholder,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { Magnify } from '@carbon/pictograms-react';
import { OptionMultiSelect } from '@/features/onboarding';
import { formatCredits } from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, PageHeader } from '@/shared/ui';
import { useLibrary } from '../../api/queries';
import {
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  libraryViewSchema,
  PRICE_CAPS,
  type LibraryEntry,
  type LibraryFilters,
  type LibraryList,
  type LibraryView,
} from '../../model/report.schema';
import { LibraryCard } from '../LibraryCard/LibraryCard';
import styles from './LibraryBrowser.module.scss';

const ALL_INDUSTRIES = 'All industries';
const ANY_PRICE = 'Any price';

/** F3 library: search, filters (in the URL), shelves by industry, cards or table. */
export function LibraryBrowser() {
  return (
    <Suspense>
      <Browser />
    </Suspense>
  );
}

function Browser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = filtersFromParams(params);
  const parsedView = libraryViewSchema.safeParse(params.get('view'));
  const view: LibraryView = parsedView.success ? parsedView.data : 'cards';
  const library = useLibrary(filters);
  const [query, setQuery] = useState(filters.q);

  const navigate = (next: LibraryFilters, nextView: LibraryView = view) => {
    const search = filtersToParams(next, nextView).toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  // Search as you type, without a history entry per keystroke.
  useEffect(() => {
    if (query === filters.q) return;
    const timer = window.setTimeout(() => navigate({ ...filters, q: query }), 300);
    return () => window.clearTimeout(timer);
    // Only the typed query should restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const facets = library.data?.facets;
  const regionLabel = (id: string) => facets?.regions.find((r) => r.id === id)?.label ?? id;
  const isFiltered = hasActiveFilters(filters);
  const clearAll = () => {
    setQuery('');
    navigate({ q: '', industry: null, regionIds: [], maxPrice: null, ownedOnly: false });
  };

  return (
    <div className={styles.root}>
      <PageHeader
        title="Library"
        subtitle="Expert-backed reports you can buy with credits and read straight away."
      />

      <section className={styles.toolbar} aria-label="Search and filter reports">
        <Search
          size="lg"
          labelText="Search the library"
          placeholder="Search by company, region or topic"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          closeButtonLabelText="Clear search"
        />
        <div className={styles.filters}>
          <Dropdown
            id="library-industry"
            titleText="Industry"
            label={ALL_INDUSTRIES}
            items={[ALL_INDUSTRIES, ...(facets?.industries ?? [])]}
            selectedItem={filters.industry ?? ALL_INDUSTRIES}
            onChange={({ selectedItem }: { selectedItem: string | null }) =>
              navigate({
                ...filters,
                industry: selectedItem && selectedItem !== ALL_INDUSTRIES ? selectedItem : null,
              })
            }
            disabled={!facets}
          />
          <OptionMultiSelect
            id="library-regions"
            titleText="Regions"
            placeholder="Any region"
            options={facets?.regions ?? []}
            value={filters.regionIds}
            onChange={(regionIds) => navigate({ ...filters, regionIds })}
          />
          <Dropdown
            id="library-price"
            titleText="Price"
            label={ANY_PRICE}
            items={[ANY_PRICE, ...PRICE_CAPS.map(String)]}
            itemToString={(item: string | null) =>
              !item || item === ANY_PRICE ? ANY_PRICE : `Up to ${formatCredits(Number(item))}`
            }
            selectedItem={filters.maxPrice ? String(filters.maxPrice) : ANY_PRICE}
            onChange={({ selectedItem }: { selectedItem: string | null }) =>
              navigate({
                ...filters,
                maxPrice: selectedItem && selectedItem !== ANY_PRICE ? Number(selectedItem) : null,
              })
            }
          />
          <div className={styles.owned}>
            <Checkbox
              id="library-owned"
              labelText="Only reports I own"
              checked={filters.ownedOnly}
              onChange={(_, { checked }) => navigate({ ...filters, ownedOnly: checked })}
            />
          </div>
        </div>

        <div className={styles.resultsBar}>
          <div className={styles.applied} role="group" aria-label="Applied filters">
            <p className={styles.count} aria-live="polite">
              {library.data ? `${library.data.items.length} reports` : 'Loading reports'}
            </p>
            {filters.q ? (
              <DismissibleTag
                type="gray"
                text={`“${filters.q}”`}
                title="Clear search"
                onClose={() => {
                  setQuery('');
                  navigate({ ...filters, q: '' });
                }}
              />
            ) : null}
            {filters.industry ? (
              <DismissibleTag
                type="gray"
                text={filters.industry}
                title="Remove industry filter"
                onClose={() => navigate({ ...filters, industry: null })}
              />
            ) : null}
            {filters.regionIds.map((id) => (
              <DismissibleTag
                key={id}
                type="gray"
                text={regionLabel(id)}
                title={`Remove ${regionLabel(id)}`}
                onClose={() =>
                  navigate({ ...filters, regionIds: filters.regionIds.filter((r) => r !== id) })
                }
              />
            ))}
            {filters.maxPrice ? (
              <DismissibleTag
                type="gray"
                text={`Up to ${formatCredits(filters.maxPrice)}`}
                title="Remove price filter"
                onClose={() => navigate({ ...filters, maxPrice: null })}
              />
            ) : null}
            {filters.ownedOnly ? (
              <DismissibleTag
                type="gray"
                text="Owned"
                title="Show all reports"
                onClose={() => navigate({ ...filters, ownedOnly: false })}
              />
            ) : null}
            {isFiltered ? (
              <Button kind="ghost" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            ) : null}
          </div>
          <ContentSwitcher
            size="sm"
            selectedIndex={view === 'table' ? 1 : 0}
            onChange={({ name }) => navigate(filters, name === 'table' ? 'table' : 'cards')}
            className={styles.viewSwitch}
          >
            <Switch name="cards" text="Cards" />
            <Switch name="table" text="Table" />
          </ContentSwitcher>
        </div>
      </section>

      <AsyncBoundary
        query={library}
        errorTitle="The library didn’t load"
        loading={
          <div className={styles.grid} aria-busy="true" aria-label="Loading reports">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonPlaceholder key={i} className={styles.skeleton} />
            ))}
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            pictogram={<Magnify aria-hidden="true" />}
            title={isFiltered ? 'No reports match these filters' : 'The library is empty right now'}
            description={
              isFiltered
                ? 'Try fewer filters, or tell us what you need: we’ll check the library and quote custom research for anything it doesn’t cover.'
                : 'Tell us what you need and we’ll scope custom research with experts.'
            }
            action={
              <div className={styles.emptyActions}>
                <Button as={Link} href="/ask" renderIcon={ArrowRight}>
                  Describe what you need
                </Button>
                {isFiltered ? (
                  <Button kind="ghost" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            }
          />
        }
      >
        {(data) =>
          view === 'table' ? (
            <LibraryTable data={data} regionLabel={regionLabel} />
          ) : isFiltered ? (
            <ul className={styles.grid} aria-label="Matching reports">
              {data.items.map((entry) => (
                <li key={entry.id}>
                  <LibraryCard entry={entry} regionLabel={regionLabel} headingLevel={2} />
                </li>
              ))}
            </ul>
          ) : (
            <Shelves items={data.items} regionLabel={regionLabel} />
          )
        }
      </AsyncBoundary>
    </div>
  );
}

function Shelves({
  items,
  regionLabel,
}: {
  items: LibraryEntry[];
  regionLabel: (id: string) => string;
}) {
  // Biggest shelves first.
  const industries = [...new Set(items.map((i) => i.category.industry))].sort(
    (a, b) =>
      items.filter((i) => i.category.industry === b).length -
      items.filter((i) => i.category.industry === a).length,
  );
  return (
    <div className={styles.shelves}>
      {industries.map((industry) => {
        const shelf = items.filter((i) => i.category.industry === industry);
        const headingId = `shelf-${industry.toLowerCase().replace(/[^a-z]+/g, '-')}`;
        return (
          <section key={industry} aria-labelledby={headingId} className={styles.shelf}>
            <h2 id={headingId} className={styles.shelfTitle}>
              {industry} <span className={styles.shelfCount}>{shelf.length}</span>
            </h2>
            <ul className={styles.grid}>
              {shelf.map((entry) => (
                <li key={entry.id}>
                  <LibraryCard entry={entry} regionLabel={regionLabel} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function LibraryTable({
  data,
  regionLabel,
}: {
  data: LibraryList;
  regionLabel: (id: string) => string;
}) {
  return (
    <TableContainer title="Reports" className={styles.table}>
      <Table aria-label="Reports">
        <TableHead>
          <TableRow>
            <TableHeader>Report</TableHeader>
            <TableHeader>Industry</TableHeader>
            <TableHeader>Regions</TableHeader>
            <TableHeader className={styles.numeric}>Experts</TableHeader>
            <TableHeader>Published</TableHeader>
            <TableHeader className={styles.numeric}>Price</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <Link href={entry.owned ? `/library/${entry.id}/read` : `/library/${entry.id}`}>
                  {entry.title}
                </Link>
              </TableCell>
              <TableCell>{entry.category.subIndustry}</TableCell>
              <TableCell>{entry.regionIds.map(regionLabel).join(', ')}</TableCell>
              <TableCell className={styles.numeric}>{entry.expertCount}</TableCell>
              <TableCell>{formatDate(entry.publishedAt)}</TableCell>
              <TableCell className={styles.numeric}>
                {entry.owned ? (
                  <Tag type="green" size="sm">
                    Owned
                  </Tag>
                ) : (
                  formatCredits(entry.priceCredits)
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
