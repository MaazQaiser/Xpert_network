'use client';

import {
  Button,
  InlineNotification,
  SkeletonText,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { ArrowLeft, ShoppingCart, SendAlt } from '@carbon/icons-react';
import { TopUpPanel, useWallet } from '@/features/wallet';
import { ErrorState } from '@/shared/ui';
import { toUserMessage } from '@/shared/api';
import { formatCredits, formatCreditsWithCurrency } from '@/shared/lib/credits';
import { useCheckout, useCoverage } from '../../api/queries';
import type { ResearchBrief, ResearchOption } from '../../model/brief.schema';
import styles from './widgets.module.scss';

type CheckoutPanelProps = {
  brief: ResearchBrief;
  option: ResearchOption;
  isInteractive: boolean;
  onChangeOption: () => void;
};

/** F2 step 7: balance check, inline top-up, buy and/or request a quote. */
export function CheckoutPanel({
  brief,
  option,
  isInteractive,
  onChangeOption,
}: CheckoutPanelProps) {
  const coverage = useCoverage(brief.id);
  const wallet = useWallet();
  const checkout = useCheckout(brief.id);

  if (coverage.isPending || wallet.isPending) return <SkeletonText paragraph lineCount={4} />;
  if (coverage.isError || wallet.isError) {
    return (
      <ErrorState
        message={toUserMessage(coverage.error ?? wallet.error)}
        onRetry={() => {
          void coverage.refetch();
          void wallet.refetch();
        }}
      />
    );
  }

  const buysReports = option !== 'custom';
  const requestsQuote = option !== 'library';
  const reports = buysReports ? coverage.data.reports : [];
  const toBuy = reports.filter((r) => !r.owned);
  const total = toBuy.reduce((sum, r) => sum + r.priceCredits, 0);
  const balance = wallet.data.balance;
  const shortfall = Math.max(0, total - balance);
  const gapQuestions = brief.questions.filter((q) =>
    option === 'mix'
      ? coverage.data.items.some((i) => i.questionId === q.id && i.coverage !== 'full')
      : true,
  );

  const primaryLabel =
    option === 'library'
      ? `Buy ${toBuy.length} ${toBuy.length === 1 ? 'report' : 'reports'} for ${formatCredits(total)}`
      : option === 'custom'
        ? 'Request a quote'
        : `Buy reports and request a quote`;

  return (
    <div className={styles.stack}>
      {buysReports ? (
        <section aria-labelledby="checkout-reports" className={styles.stack}>
          <h3 id="checkout-reports" className={styles.sectionTitle}>
            Library reports
          </h3>
          <StructuredListWrapper isCondensed aria-label="Reports in this order">
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>Report</StructuredListCell>
                <StructuredListCell head className={styles.numeric}>
                  Price
                </StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {reports.map((report) => (
                <StructuredListRow key={report.id}>
                  <StructuredListCell>
                    {report.title}
                    <span className={styles.muted}>
                      {' '}
                      · {report.expertCount} experts · answers {report.questionIds.length}{' '}
                      {report.questionIds.length === 1 ? 'question' : 'questions'}
                    </span>
                  </StructuredListCell>
                  <StructuredListCell className={styles.numeric}>
                    {report.owned
                      ? 'Already owned'
                      : formatCreditsWithCurrency(report.priceCredits)}
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
          <p className={styles.total}>
            Total {formatCreditsWithCurrency(total)} · Your balance {formatCredits(balance)}
          </p>
          {shortfall > 0 ? (
            <div className={styles.stack}>
              <InlineNotification
                kind="warning"
                title="Not enough credits"
                subtitle={`You need ${formatCredits(shortfall)} more. Top up below. Your order is kept.`}
                lowContrast
                hideCloseButton
              />
              {isInteractive ? <TopUpPanel shortfall={shortfall} /> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {requestsQuote ? (
        <section aria-labelledby="checkout-custom" className={styles.stack}>
          <h3 id="checkout-custom" className={styles.sectionTitle}>
            Custom research quote
          </h3>
          <p className={styles.muted}>
            We’ll quote for these {gapQuestions.length}{' '}
            {gapQuestions.length === 1 ? 'question' : 'questions'}. Requesting a quote is free;
            credits are only held if you accept it.
          </p>
          <ol className={styles.numbered}>
            {gapQuestions.map((question) => (
              <li key={question.id}>{question.text}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {checkout.isError ? (
        <InlineNotification
          kind="error"
          title="Checkout didn’t go through"
          subtitle={toUserMessage(checkout.error)}
          lowContrast
          hideCloseButton
        />
      ) : null}

      {isInteractive ? (
        <div className={styles.buttonRow}>
          <Button
            size="md"
            renderIcon={option === 'custom' ? SendAlt : ShoppingCart}
            disabled={checkout.isPending || shortfall > 0}
            onClick={() => checkout.mutate({ option, reportIds: toBuy.map((r) => r.id) })}
          >
            {checkout.isPending ? 'Processing…' : primaryLabel}
          </Button>
          <Button
            kind="ghost"
            size="md"
            renderIcon={ArrowLeft}
            disabled={checkout.isPending}
            onClick={onChangeOption}
          >
            Change option
          </Button>
        </div>
      ) : null}
    </div>
  );
}
