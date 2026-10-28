'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  InlineNotification,
  Modal,
  SkeletonPlaceholder,
  SkeletonText,
  Stack,
  Tag,
} from '@carbon/react';
import { Certificate, Time, UserAvatar, UserMultiple } from '@carbon/icons-react';
import { TopUpPanel, useWallet } from '@/features/wallet';
import { toUserMessage } from '@/shared/api';
import {
  formatCredits,
  formatCreditsWithCurrency,
  formatCurrencyEquivalent,
} from '@/shared/lib/credits';
import { formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, NotFoundState, PageHeader } from '@/shared/ui';
import { useLibraryEntry, usePurchaseReport } from '../../api/queries';
import type { LibraryEntry } from '../../model/report.schema';
import { ReportChart } from '../ReportChart/ReportChart';
import styles from './ReportPreview.module.scss';

/** F3 report preview: enough to judge the report before buying it, and the purchase. */
export function ReportPreview({ itemId }: { itemId: string }) {
  const entry = useLibraryEntry(itemId);
  return (
    <AsyncBoundary
      query={entry}
      errorTitle="This report didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that report"
          message="It may have been withdrawn, or the link is incomplete."
          backHref="/library"
          backLabel="Back to the library"
        />
      }
      loading={
        <div className={styles.layout} aria-busy="true" aria-label="Loading report">
          <div className={styles.main}>
            <SkeletonText heading width="70%" />
            <SkeletonText paragraph lineCount={4} />
            <SkeletonPlaceholder className={styles.skeletonChart} />
          </div>
          <SkeletonPlaceholder className={styles.skeletonAside} />
        </div>
      }
    >
      {(data) => <PreviewView entry={data} />}
    </AsyncBoundary>
  );
}

function PreviewView({ entry }: { entry: LibraryEntry }) {
  const sampleIndex = entry.toc.findIndex((s) =>
    entry.sampleChart.title.toLowerCase().includes(s.title.split(' ')[0]?.toLowerCase() ?? ''),
  );
  return (
    <>
      <PageHeader
        title={entry.title}
        subtitle={entry.summary}
        breadcrumbs={[{ label: 'Library', href: '/library' }]}
      />
      <div className={styles.layout}>
        <div className={styles.main}>
          <ul className={styles.facts} aria-label="About this report">
            <li>
              <Tag type="gray" size="md">
                {entry.category.subIndustry}
              </Tag>
            </li>
            <li className={styles.fact}>
              <UserMultiple size={16} aria-hidden="true" /> {entry.expertCount} experts
            </li>
            <li className={styles.fact}>
              <Time size={16} aria-hidden="true" /> {entry.readMinutes} min read
            </li>
            <li className={styles.fact}>Published {formatDate(entry.publishedAt)}</li>
          </ul>

          <section className={styles.card} aria-labelledby="inside-heading">
            <h2 id="inside-heading" className={styles.sectionTitle}>
              What’s inside
            </h2>
            <ol className={styles.toc}>
              {entry.toc.map((section, index) => (
                <li key={section.id} className={styles.tocItem}>
                  <span className={styles.tocNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{section.title}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.card} aria-labelledby="sample-heading">
            <h2 id="sample-heading" className={styles.sectionTitle}>
              A sample from the report
            </h2>
            <ReportChart
              chart={entry.sampleChart}
              caption={
                sampleIndex >= 0
                  ? `From section ${sampleIndex + 1}. Figures are expert estimates.`
                  : 'Figures are expert estimates.'
              }
            />
          </section>

          <section className={styles.card} aria-labelledby="experts-heading">
            <h2 id="experts-heading" className={styles.sectionTitle}>
              Who you’ll hear from
            </h2>
            <p className={styles.help}>
              Experts are anonymous. You see their role, experience and region.
            </p>
            <ul className={styles.experts}>
              {entry.experts.map((expert) => (
                <li key={`${expert.role}-${expert.region}`} className={styles.expert}>
                  <span className={styles.expertIcon} aria-hidden="true">
                    <UserAvatar size={20} />
                  </span>
                  <span>
                    <span className={styles.expertRole}>{expert.role}</span>
                    <span className={styles.expertMeta}>
                      {expert.years} years · {expert.region}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {entry.expertCount > entry.experts.length ? (
              <p className={styles.help}>
                and {entry.expertCount - entry.experts.length} more experts.
              </p>
            ) : null}
          </section>

          <section className={styles.provenance} aria-labelledby="provenance-heading">
            <Certificate size={20} aria-hidden="true" className={styles.provenanceIcon} />
            <div>
              <h2 id="provenance-heading" className={styles.provenanceTitle}>
                Where this comes from
              </h2>
              <p className={styles.help}>{entry.provenance}</p>
            </div>
          </section>
        </div>

        <aside className={styles.aside} aria-label="Price and purchase">
          <PurchaseCard entry={entry} />
        </aside>
      </div>
    </>
  );
}

function PurchaseCard({ entry }: { entry: LibraryEntry }) {
  const router = useRouter();
  const wallet = useWallet();
  const purchase = usePurchaseReport(entry.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const balance = wallet.data?.balance;
  const shortfall = balance === undefined ? 0 : Math.max(0, entry.priceCredits - balance);

  if (entry.owned) {
    return (
      <div className={styles.purchase}>
        <Tag type="green" size="md">
          Owned
        </Tag>
        <p className={styles.help}>
          You bought this report{entry.purchasedAt ? ` on ${formatDate(entry.purchasedAt)}` : ''}.
        </p>
        <Button as={Link} href={`/library/${entry.id}/read`}>
          Open report
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.purchase}>
      <p className={styles.priceLabel}>Price</p>
      <p className={styles.price}>{formatCredits(entry.priceCredits)}</p>
      <p className={styles.help}>{formatCurrencyEquivalent(entry.priceCredits)} · yours to keep</p>
      {balance !== undefined ? (
        <p className={styles.balance}>
          Your balance: <strong>{formatCredits(balance)}</strong>
        </p>
      ) : null}

      {shortfall > 0 ? (
        <Stack gap={5}>
          <InlineNotification
            kind="warning"
            title="Not enough credits"
            subtitle={`You need ${formatCredits(shortfall)} more to buy this report.`}
            lowContrast
            hideCloseButton
            className={styles.notice}
          />
          <TopUpPanel shortfall={shortfall} />
        </Stack>
      ) : (
        <Button
          className={styles.buy}
          disabled={balance === undefined}
          onClick={() => {
            purchase.reset();
            setIsConfirming(true);
          }}
        >
          Buy for {formatCredits(entry.priceCredits)}
        </Button>
      )}

      {/* Portalled: the sticky price column is its own stacking context and would trap the
          modal under the app header and side nav. */}
      {createPortal(
        <Modal
          open={isConfirming}
          modalHeading="Buy this report?"
          primaryButtonText={
            purchase.isPending ? 'Buying…' : `Buy for ${formatCredits(entry.priceCredits)}`
          }
          secondaryButtonText="Cancel"
          primaryButtonDisabled={purchase.isPending}
          onRequestClose={() => setIsConfirming(false)}
          onRequestSubmit={() =>
            purchase.mutate(undefined, {
              onSuccess: () => router.push(`/library/${entry.id}/read?purchased=1`),
            })
          }
          size="sm"
        >
          <Stack gap={5}>
            <p className={styles.modalTitle}>{entry.title}</p>
            <dl className={styles.summary}>
              <dt>Price</dt>
              <dd>{formatCreditsWithCurrency(entry.priceCredits)}</dd>
              {balance !== undefined ? (
                <>
                  <dt>Balance after</dt>
                  <dd>{formatCredits(balance - entry.priceCredits)}</dd>
                </>
              ) : null}
            </dl>
            <p className={styles.help}>
              You can read it straight away and ask questions about it. Purchases can’t be undone.
            </p>
            {purchase.isError ? (
              <InlineNotification
                kind="error"
                title="Couldn’t buy this report"
                subtitle={toUserMessage(purchase.error)}
                lowContrast
                hideCloseButton
              />
            ) : null}
          </Stack>
        </Modal>,
        document.body,
      )}
    </div>
  );
}
