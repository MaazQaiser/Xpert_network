'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, InlineNotification, SkeletonPlaceholder, SkeletonText, Tag } from '@carbon/react';
import { ArrowRight, Chat, Download } from '@carbon/icons-react';
import { Lock_01 as LockPictogram } from '@carbon/pictograms-react';
import { isApiError } from '@/shared/api';
import { formatDate } from '@/shared/lib/dates';
import { useBreakpointUp } from '@/shared/hooks/useMediaQuery';
import { AsyncBoundary, EmptyState, NotFoundState, PageHeader } from '@/shared/ui';
import { useReport } from '../../api/queries';
import type { Report, ReportSection } from '../../model/report.schema';
import { AskReportPanel } from '../AskReportPanel/AskReportPanel';
import { ReportChart } from '../ReportChart/ReportChart';
import styles from './ReportViewer.module.scss';

const sectionAnchor = (id: string) => `section-${id}`;

/** F3 report viewer: contents, sections, figures, quotes, and "Ask this report". */
export function ReportViewer({ itemId }: { itemId: string }) {
  return (
    <Suspense>
      <Viewer itemId={itemId} />
    </Suspense>
  );
}

function Viewer({ itemId }: { itemId: string }) {
  const report = useReport(itemId);

  if (isApiError(report.error) && report.error.code === 'not_owned') {
    return (
      <EmptyState
        pictogram={<LockPictogram aria-hidden="true" />}
        title="You don’t own this report yet"
        description="Buy it to read the full report and ask questions about it."
        action={
          <Button as={Link} href={`/library/${itemId}`} renderIcon={ArrowRight}>
            See preview and price
          </Button>
        }
      />
    );
  }

  return (
    <AsyncBoundary
      query={report}
      errorTitle="This report didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that report"
          message="It may have been withdrawn, or the link is incomplete. Reports you own are in your workspace."
          backHref="/workspace"
          backLabel="Go to your workspace"
        />
      }
      loading={
        <div className={styles.layout} aria-busy="true" aria-label="Loading report">
          <SkeletonText paragraph lineCount={5} />
          <div>
            <SkeletonText heading width="60%" />
            <SkeletonText paragraph lineCount={8} />
            <SkeletonPlaceholder className={styles.skeletonChart} />
          </div>
        </div>
      }
    >
      {(data) => <ViewerBody report={data} />}
    </AsyncBoundary>
  );
}

function ViewerBody({ report }: { report: Report }) {
  const { entry, sections } = report;
  const params = useSearchParams();
  const isWide = useBreakpointUp('max');
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState(false);
  const activeSection = useActiveSection(sections);
  const justBought = params.get('purchased') === '1';

  const goToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionAnchor(sectionId));
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    element.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    setHighlighted(sectionId);
    window.setTimeout(() => setHighlighted(null), 2000);
  }, []);

  return (
    <>
      <PageHeader
        title={entry.title}
        breadcrumbs={[{ label: 'Library', href: '/library' }]}
        subtitle={
          <>
            {entry.purchasedAt ? `Bought ${formatDate(entry.purchasedAt)} · ` : ''}
            {entry.readMinutes} min read · {entry.expertCount} experts
          </>
        }
        actions={
          <>
            <Button kind="tertiary" renderIcon={Download} onClick={() => setPdfNotice(true)}>
              Download PDF
            </Button>
            {!isWide ? (
              <Button
                renderIcon={Chat}
                aria-expanded={isAskOpen}
                aria-controls="ask-report"
                onClick={() => setIsAskOpen((open) => !open)}
              >
                {isAskOpen ? 'Hide questions' : 'Ask this report'}
              </Button>
            ) : null}
          </>
        }
      />

      <div className={styles.notices}>
        {justBought ? (
          <InlineNotification
            kind="success"
            title="Report purchased"
            subtitle={`${entry.priceCredits} credits were taken from your wallet. It’s yours to keep.`}
            lowContrast
            className={styles.notice}
          />
        ) : null}
        {entry.updatedSincePurchase ? (
          <InlineNotification
            kind="info"
            title={`Updated since you bought it · ${formatDate(entry.updatedAt)}`}
            subtitle={entry.updateNote ?? 'Experts refreshed some figures.'}
            lowContrast
            className={styles.notice}
          />
        ) : null}
        {pdfNotice ? (
          <InlineNotification
            kind="success"
            title="PDF ready"
            subtitle="Prototype: no file is downloaded."
            lowContrast
            onCloseButtonClick={() => setPdfNotice(false)}
            className={styles.notice}
          />
        ) : null}
      </div>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label="Report contents">
          <p className={styles.tocTitle}>Contents</p>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${sectionAnchor(section.id)}`}
                  className={styles.tocLink}
                  aria-current={activeSection === section.id ? 'location' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goToSection(section.id);
                  }}
                >
                  <span className={styles.tocNumber}>{index + 1}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.article} aria-label={entry.title}>
          {sections.map((section, index) => (
            <SectionView
              key={section.id}
              section={section}
              number={index + 1}
              isHighlighted={highlighted === section.id}
            />
          ))}
          <p className={styles.provenance}>{entry.provenance}</p>
        </article>

        {/* One mounted panel: below the widest breakpoint it opens above the report instead of
            beside it, and the conversation survives toggling and resizing. */}
        <aside className={isWide || isAskOpen ? styles.askAside : styles.askHidden}>
          <AskReportPanel
            itemId={entry.id}
            sections={sections}
            starters={report.starterQuestions}
            onCite={goToSection}
          />
        </aside>
      </div>
    </>
  );
}

function SectionView({
  section,
  number,
  isHighlighted,
}: {
  section: ReportSection;
  number: number;
  isHighlighted: boolean;
}) {
  const headingId = `${sectionAnchor(section.id)}-heading`;
  return (
    <section
      id={sectionAnchor(section.id)}
      aria-labelledby={headingId}
      className={isHighlighted ? `${styles.section} ${styles.highlighted}` : styles.section}
    >
      <h2 id={headingId} tabIndex={-1} className={styles.sectionTitle}>
        <span className={styles.sectionNumber}>{number}</span> {section.title}
      </h2>
      <p className={styles.lead}>{section.summary}</p>
      {section.figures.length > 0 ? (
        <ul className={styles.figures} aria-label="Key figures">
          {section.figures.map((figure) => (
            <li key={figure.label} className={styles.figure}>
              <span className={styles.figureValue}>{figure.value}</span>
              <span className={styles.figureLabel}>{figure.label}</span>
              {figure.note ? <span className={styles.figureNote}>{figure.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {section.body.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className={styles.paragraph}>
          {paragraph}
        </p>
      ))}
      {section.chart ? <ReportChart chart={section.chart} caption="Expert estimates." /> : null}
      {section.quotes.map((quote) => (
        <figure key={quote.id} className={styles.quote}>
          <blockquote className={styles.quoteText}>“{quote.text}”</blockquote>
          <figcaption className={styles.quoteSource}>
            <Tag type="gray" size="sm">
              Expert interview
            </Tag>
            {quote.expert.role} · {quote.expert.years} years · {quote.expert.region}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

/** Which section is in view, for the contents' "you are here" marker. */
function useActiveSection(sections: ReportSection[]): string | null {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        const first = visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        if (first) setActive(first.target.id.replace('section-', ''));
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    sections.forEach((s) => {
      const el = document.getElementById(sectionAnchor(s.id));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);
  return active;
}
