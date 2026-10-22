'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  InlineNotification,
  Modal,
  RadioButton,
  RadioButtonGroup,
  SkeletonPlaceholder,
  TextInput,
} from '@carbon/react';
import { Banking } from '@carbon/pictograms-react';
import { ArrowRight, Edit } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { formatUsd } from '@/shared/lib/money';
import { AsyncBoundary, EmptyState, PageHeader, StatusTag, type StatusTone } from '@/shared/ui';
import { useEarnings, useRequestPayout, useSetPayoutMethod } from '../../api/queries';
import {
  EARNING_STATUS_LABELS,
  payoutMethodFormSchema,
  toPayoutMethodInput,
  type EarningStatus,
  type Earnings,
  type PayoutMethodForm,
} from '../../model/earnings.schema';
import styles from './EarningsView.module.scss';

const STATUS_TONE: Record<EarningStatus, StatusTone> = {
  pending: 'progress',
  approved: 'info',
  paid: 'success',
  rejected: 'neutral',
};

/** F10: what's pending, approved and paid; request a payout; set the payout method. */
export function EarningsView() {
  const earnings = useEarnings();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Earnings"
        subtitle="Fees for accepted interviews, and payouts to your bank or PayPal."
      />
      <AsyncBoundary
        query={earnings}
        errorTitle="Your earnings didn’t load"
        loading={
          <div className={styles.totals} aria-busy="true" aria-label="Loading your earnings">
            {[0, 1, 2].map((i) => (
              <SkeletonPlaceholder key={i} className={styles.skeleton} />
            ))}
          </div>
        }
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            pictogram={<Banking aria-hidden="true" />}
            title="No earnings yet"
            description="Each interview you complete shows here: under review first, then approved, then paid."
            action={
              <Button as={Link} href={routes.expert.calls}>
                Browse interview requests
              </Button>
            }
          />
        }
      >
        {(data) => <EarningsContent earnings={data} />}
      </AsyncBoundary>
    </div>
  );
}

function EarningsContent({ earnings }: { earnings: Earnings }) {
  const request = useRequestPayout();
  const [dialog, setDialog] = useState<'payout' | 'method' | null>(null);
  const [justRequested, setJustRequested] = useState(false);
  const { totals, method, minPayoutUsd } = earnings;
  const canRequest = Boolean(method) && totals.availableUsd >= minPayoutUsd;

  return (
    <>
      <section className={styles.totals} aria-label="Totals">
        <div className={styles.total}>
          <p className={styles.totalLabel}>Available to pay out</p>
          <p className={styles.totalValue}>{formatUsd(totals.availableUsd)}</p>
          <p className={styles.totalNote}>
            {canRequest
              ? `Goes to ${method?.label}`
              : !method
                ? 'Add a payout method to get paid'
                : `You can request a payout from ${formatUsd(minPayoutUsd)}`}
          </p>
          <div>
            <Button
              renderIcon={ArrowRight}
              disabled={!canRequest || request.isPending}
              onClick={() => setDialog('payout')}
            >
              Request payout
            </Button>
          </div>
        </div>
        <div className={styles.total}>
          <p className={styles.totalLabel}>Under review</p>
          <p className={styles.totalValue}>{formatUsd(totals.pendingUsd)}</p>
          <p className={styles.totalNote}>Usually decided within 48 hours of submitting</p>
        </div>
        <div className={styles.total}>
          <p className={styles.totalLabel}>Paid to date</p>
          <p className={styles.totalValue}>{formatUsd(totals.paidUsd)}</p>
          <p className={styles.totalNote}>
            {totals.requestedUsd
              ? `${formatUsd(totals.requestedUsd)} on its way`
              : 'Nothing on its way right now'}
          </p>
        </div>
      </section>

      {justRequested && totals.requestedUsd ? (
        <InlineNotification
          kind="success"
          title="Payout requested"
          subtitle={`${formatUsd(totals.requestedUsd)} is on its way to ${method?.label}. It usually arrives in 1–3 working days.`}
          lowContrast
          onClose={() => setJustRequested(false)}
          className={styles.notice}
        />
      ) : null}

      <section className={styles.card} aria-labelledby="method-heading">
        <div className={styles.cardHeader}>
          <h2 id="method-heading" className={styles.cardTitle}>
            Payout method
          </h2>
          <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => setDialog('method')}>
            {method ? 'Change' : 'Add payout method'}
          </Button>
        </div>
        <p className={styles.body}>
          {method ? (
            <>
              {method.label} · {method.holder}
            </>
          ) : (
            'No payout method yet. Add a bank account or PayPal to get paid.'
          )}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="interviews-heading">
        <h2 id="interviews-heading" className={styles.cardTitle}>
          Interviews
        </h2>
        <ul className={styles.items} aria-labelledby="interviews-heading">
          {earnings.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemText}>
                {item.interviewId ? (
                  <Link
                    href={routes.expert.interview(item.interviewId)}
                    className={styles.itemTitle}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className={styles.itemTitle}>{item.title}</span>
                )}
                <span className={styles.note}>
                  Submitted {formatDate(item.submittedAt)}
                  {item.note ? ` · ${item.note}` : ''}
                </span>
              </div>
              <span className={styles.itemFee}>{formatUsd(item.feeUsd)}</span>
              <StatusTag
                tone={STATUS_TONE[item.status]}
                label={EARNING_STATUS_LABELS[item.status]}
              />
            </li>
          ))}
        </ul>
      </section>

      {earnings.payouts.length ? (
        <section className={styles.card} aria-labelledby="payouts-heading">
          <h2 id="payouts-heading" className={styles.cardTitle}>
            Payouts
          </h2>
          <ul className={styles.payouts}>
            {earnings.payouts.map((payout) => (
              <li key={payout.id} className={styles.payout}>
                <span>
                  <strong>{formatUsd(payout.amountUsd)}</strong> to {payout.methodLabel}
                </span>
                <span className={styles.note}>
                  {payout.status === 'paid' && payout.paidAt
                    ? `Paid ${formatDate(payout.paidAt)}`
                    : `Requested ${formatDate(payout.requestedAt)} · on its way`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {createPortal(
        <>
          <Modal
            open={dialog === 'payout'}
            size="sm"
            modalHeading={`Request a payout of ${formatUsd(totals.availableUsd)}?`}
            primaryButtonText={request.isPending ? 'Requesting…' : 'Request payout'}
            secondaryButtonText="Cancel"
            primaryButtonDisabled={request.isPending}
            onRequestClose={() => setDialog(null)}
            onRequestSubmit={() =>
              request.mutate(undefined, {
                onSuccess: () => {
                  setDialog(null);
                  setJustRequested(true);
                },
              })
            }
          >
            <p className={styles.body}>
              We’ll send it to {method?.label}. Payouts usually arrive in 1–3 working days.
            </p>
            {request.isError ? (
              <InlineNotification
                kind="error"
                title="Payout not requested"
                subtitle={toUserMessage(request.error)}
                lowContrast
                hideCloseButton
              />
            ) : null}
          </Modal>
          {dialog === 'method' ? (
            <MethodDialog earnings={earnings} onClose={() => setDialog(null)} />
          ) : null}
        </>,
        document.body,
      )}
    </>
  );
}

function MethodDialog({ earnings, onClose }: { earnings: Earnings; onClose: () => void }) {
  const save = useSetPayoutMethod();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PayoutMethodForm>({
    resolver: zodResolver(payoutMethodFormSchema),
    defaultValues: {
      kind: earnings.method?.kind ?? 'bank',
      holder: earnings.method?.holder ?? '',
      iban: '',
      email: '',
    },
  });
  const kind = useWatch({ control, name: 'kind' });

  const submit = handleSubmit((values) => {
    save.mutate(toPayoutMethodInput(values), {
      onSuccess: onClose,
      onError: (error) => setError('root', { message: toUserMessage(error) }),
    });
  });

  return (
    <Modal
      open
      size="sm"
      modalHeading={earnings.method ? 'Change payout method' : 'Add a payout method'}
      primaryButtonText={save.isPending ? 'Saving…' : 'Save payout method'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={save.isPending}
      selectorPrimaryFocus="#payout-holder"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <div className={styles.dialogBody}>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <RadioButtonGroup
              legendText="Pay me by"
              name="payout-kind"
              orientation="horizontal"
              valueSelected={field.value}
              onChange={(value) => field.onChange(value)}
            >
              <RadioButton id="payout-bank" value="bank" labelText="Bank transfer" />
              <RadioButton id="payout-paypal" value="paypal" labelText="PayPal" />
            </RadioButtonGroup>
          )}
        />
        <TextInput
          id="payout-holder"
          labelText="Account holder"
          autoComplete="name"
          invalid={Boolean(errors.holder)}
          invalidText={errors.holder?.message}
          {...register('holder')}
        />
        {kind === 'bank' ? (
          <TextInput
            id="payout-iban"
            labelText="IBAN"
            helperText="We only keep the last four digits to show you."
            autoComplete="off"
            invalid={Boolean(errors.iban)}
            invalidText={errors.iban?.message}
            {...register('iban')}
          />
        ) : (
          <TextInput
            id="payout-email"
            type="email"
            labelText="PayPal email"
            autoComplete="email"
            invalid={Boolean(errors.email)}
            invalidText={errors.email?.message}
            {...register('email')}
          />
        )}
        <p className={styles.note}>Prototype: nothing is sent to a bank or PayPal.</p>
        {errors.root ? (
          <InlineNotification
            kind="error"
            title="Payout method not saved"
            subtitle={errors.root.message}
            lowContrast
            hideCloseButton
          />
        ) : null}
      </div>
    </Modal>
  );
}
