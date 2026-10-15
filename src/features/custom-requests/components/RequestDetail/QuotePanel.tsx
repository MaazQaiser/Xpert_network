'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Button,
  InlineNotification,
  Modal,
  RadioButton,
  RadioButtonGroup,
  Stack,
  TextArea,
} from '@carbon/react';
import { Checkmark, Close } from '@carbon/icons-react';
import { TopUpPanel, useWallet } from '@/features/wallet';
import { toUserMessage } from '@/shared/api';
import { formatCredits, formatCurrencyEquivalent } from '@/shared/lib/credits';
import { addDays, formatDate } from '@/shared/lib/dates';
import { useAcceptQuote, useDeclineQuote } from '../../api/queries';
import { DECLINE_REASONS, type CustomRequest } from '../../model/request.schema';
import styles from './RequestDetail.module.scss';

type DeclineReason = (typeof DECLINE_REASONS)[number];

/** F4 quote: scope in/out, experts, timeline, credits, validity; accept (hold) or decline. */
export function QuotePanel({ request }: { request: CustomRequest }) {
  const quote = request.quote;
  const wallet = useWallet();
  const accept = useAcceptQuote(request.id);
  const decline = useDeclineQuote(request.id);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason>(DECLINE_REASONS[0]);
  const [comment, setComment] = useState('');
  if (!quote) return null;

  const balance = wallet.data?.balance;
  const shortfall = balance === undefined ? 0 : Math.max(0, quote.credits - balance);
  const questionText = (id: string) => request.questions.find((q) => q.id === id)?.text ?? id;

  return (
    <section className={styles.card} aria-labelledby="quote-heading">
      <div className={styles.quoteHeader}>
        <div>
          <h2 id="quote-heading" className={styles.cardTitle}>
            Your quote{quote.version > 1 ? ` (revised, v${quote.version})` : ''}
          </h2>
          <p className={styles.help}>Valid until {formatDate(quote.validUntil)}</p>
        </div>
        <div className={styles.price}>
          <span className={styles.priceValue}>{formatCredits(quote.credits)}</span>
          <span className={styles.help}>{formatCurrencyEquivalent(quote.credits)}</span>
        </div>
      </div>

      {quote.revisionNote ? (
        <InlineNotification
          kind="info"
          title="Quote revised"
          subtitle={quote.revisionNote}
          lowContrast
          hideCloseButton
          className={styles.notice}
        />
      ) : null}

      <dl className={styles.facts}>
        <div>
          <dt>Experts</dt>
          <dd>{quote.experts} interviews</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>
            {quote.etaDays} days · by {formatDate(addDays(new Date(), quote.etaDays).toISOString())}{' '}
            if accepted today
          </dd>
        </div>
      </dl>

      <div className={styles.scope}>
        <div>
          <h3 className={styles.subTitle}>In scope</h3>
          <ul className={styles.checkList}>
            {quote.questionIdsIn.map((id) => (
              <li key={id}>
                <Checkmark size={16} aria-hidden="true" className={styles.inIcon} />
                {questionText(id)}
              </li>
            ))}
          </ul>
        </div>
        {quote.questionsOut.length > 0 ? (
          <div>
            <h3 className={styles.subTitle}>Not in this quote</h3>
            <ul className={styles.checkList}>
              {quote.questionsOut.map((q) => (
                <li key={q.questionId}>
                  <Close size={16} aria-hidden="true" />
                  <span>
                    {questionText(q.questionId)}
                    <span className={styles.reason}>{q.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <h3 className={styles.subTitle}>Included</h3>
          <ul className={styles.bullets}>
            {quote.includes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.explainer}>
        <h3 className={styles.subTitle}>How credits work</h3>
        <p className={styles.help}>
          Accepting <strong>holds</strong> {formatCredits(quote.credits)} from your balance. They’re{' '}
          <strong>spent</strong> only when the research is delivered. If fewer experts take part,
          the difference is refunded, and you can cancel for a full refund until interviews start.
        </p>
      </div>

      {shortfall > 0 ? (
        <Stack gap={5}>
          <InlineNotification
            kind="warning"
            title="Not enough credits to accept"
            subtitle={`You need ${formatCredits(shortfall)} more.`}
            lowContrast
            hideCloseButton
            className={styles.notice}
          />
          <TopUpPanel shortfall={shortfall} />
        </Stack>
      ) : null}

      <div className={styles.actions}>
        <Button
          disabled={shortfall > 0 || balance === undefined}
          onClick={() => {
            accept.reset();
            setIsAccepting(true);
          }}
        >
          Accept and hold {formatCredits(quote.credits)}
        </Button>
        <Button as="a" href="#request-messages" kind="tertiary">
          Ask a question
        </Button>
        <Button
          kind="ghost"
          onClick={() => {
            decline.reset();
            setIsDeclining(true);
          }}
        >
          Decline
        </Button>
      </div>

      {createPortal(
        <>
          <Modal
            open={isAccepting}
            modalHeading="Accept this quote?"
            primaryButtonText={
              accept.isPending ? 'Accepting…' : `Accept and hold ${formatCredits(quote.credits)}`
            }
            secondaryButtonText="Cancel"
            primaryButtonDisabled={accept.isPending}
            onRequestClose={() => setIsAccepting(false)}
            onRequestSubmit={() =>
              accept.mutate(undefined, { onSuccess: () => setIsAccepting(false) })
            }
            size="sm"
          >
            <Stack gap={5}>
              <dl className={styles.summary}>
                <dt>Held now</dt>
                <dd>{formatCredits(quote.credits)}</dd>
                {balance !== undefined ? (
                  <>
                    <dt>Available after</dt>
                    <dd>{formatCredits(balance - quote.credits)}</dd>
                  </>
                ) : null}
                <dt>Delivery</dt>
                <dd>in about {quote.etaDays} days</dd>
              </dl>
              <p className={styles.help}>
                Credits are spent on delivery. Cancel before interviews start for a full refund.
              </p>
              {accept.isError ? (
                <InlineNotification
                  kind="error"
                  title="Couldn’t accept the quote"
                  subtitle={toUserMessage(accept.error)}
                  lowContrast
                  hideCloseButton
                />
              ) : null}
            </Stack>
          </Modal>
          <Modal
            open={isDeclining}
            modalHeading="Decline this quote?"
            primaryButtonText={decline.isPending ? 'Declining…' : 'Decline quote'}
            secondaryButtonText="Keep the quote"
            danger
            primaryButtonDisabled={decline.isPending}
            onRequestClose={() => setIsDeclining(false)}
            onRequestSubmit={() =>
              decline.mutate({ reason, comment }, { onSuccess: () => setIsDeclining(false) })
            }
            size="sm"
          >
            <Stack gap={5}>
              <RadioButtonGroup
                legendText="Why are you declining?"
                name="decline-reason"
                orientation="vertical"
                valueSelected={reason}
                onChange={(value) => setReason(value as DeclineReason)}
              >
                {DECLINE_REASONS.map((r) => (
                  <RadioButton key={r} id={`decline-${r}`} value={r} labelText={r} />
                ))}
              </RadioButtonGroup>
              <TextArea
                id="decline-comment"
                labelText="Anything else? (optional)"
                rows={2}
                maxCount={500}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              {decline.isError ? (
                <InlineNotification
                  kind="error"
                  title="Couldn’t decline"
                  subtitle={toUserMessage(decline.error)}
                  lowContrast
                  hideCloseButton
                />
              ) : null}
            </Stack>
          </Modal>
        </>,
        document.body,
      )}
    </section>
  );
}
