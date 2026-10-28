'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Button,
  DataTableSkeleton,
  Dropdown,
  InlineNotification,
  Modal,
  RadioButton,
  RadioButtonGroup,
  RadioTile,
  SkeletonPlaceholder,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from '@carbon/react';
import { Information } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { formatCreditPrice, formatCredits, formatCurrencyEquivalent } from '@/shared/lib/credits';
import { formatDateTime, formatDate } from '@/shared/lib/dates';
import { AsyncBoundary, EmptyState, ErrorState, PageHeader } from '@/shared/ui';
import { Receipt } from '@carbon/pictograms-react';
import { useCreditPacks, useTopUp, useWallet } from '../../api/useWallet';
import {
  spentThisMonth,
  TRANSACTION_LABELS,
  type CreditPack,
  type TransactionType,
  type Wallet,
} from '../../model/wallet.schema';
import styles from './WalletOverview.module.scss';

const TYPE_TAG: Record<TransactionType, 'green' | 'gray' | 'blue' | 'purple' | 'teal'> = {
  top_up: 'green',
  purchase: 'gray',
  hold: 'blue',
  spent: 'purple',
  refund: 'teal',
};

type TypeFilter = TransactionType | 'all';
const FILTERS: TypeFilter[] = ['all', 'top_up', 'purchase', 'hold', 'spent', 'refund'];

/** F6 wallet: balance, held credits, buying credits (mock checkout) and history. */
export function WalletOverview() {
  const wallet = useWallet();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Wallet"
        subtitle="Credits pay for library reports and custom research. 1 credit ≈ $5."
      />
      <AsyncBoundary
        query={wallet}
        errorTitle="Your wallet didn’t load"
        loading={
          <div className={styles.balances} aria-busy="true" aria-label="Loading your wallet">
            {[0, 1, 2].map((i) => (
              <SkeletonPlaceholder key={i} className={styles.skeletonCard} />
            ))}
          </div>
        }
      >
        {(data) => <Balances wallet={data} />}
      </AsyncBoundary>
      <BuyCredits />
      <History />
    </div>
  );
}

function Balances({ wallet }: { wallet: Wallet }) {
  const spent = spentThisMonth(wallet.transactions);
  return (
    <section className={styles.balances} aria-label="Balance">
      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>Available</p>
        <p className={styles.balanceValue}>{formatCredits(wallet.balance)}</p>
        <p className={styles.balanceNote}>{formatCurrencyEquivalent(wallet.balance)}</p>
      </div>
      <div className={styles.balanceCard}>
        <div className={styles.labelRow}>
          <p className={styles.balanceLabel}>Held for custom research</p>
          <Toggletip align="bottom">
            <ToggletipButton label="What are held credits?">
              <Information />
            </ToggletipButton>
            <ToggletipContent>
              <p>
                When you accept a quote, its credits are reserved. They’re spent when the research
                is delivered and refunded if the request is cancelled.
              </p>
            </ToggletipContent>
          </Toggletip>
        </div>
        <p className={styles.balanceValue}>{formatCredits(wallet.held)}</p>
        <p className={styles.balanceNote}>
          {wallet.held === 0 ? 'Nothing reserved right now' : 'Not spendable until released'}
        </p>
      </div>
      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>Spent this month</p>
        <p className={styles.balanceValue}>{formatCredits(spent)}</p>
        <p className={styles.balanceNote}>Reports and custom research</p>
      </div>
    </section>
  );
}

function BuyCredits() {
  const packs = useCreditPacks();
  const wallet = useWallet();
  const topUp = useTopUp();
  const [selected, setSelected] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [payment, setPayment] = useState('card');
  const [added, setAdded] = useState<{ credits: number; balance: number } | null>(null);
  const popular = packs.data?.find((p) => p.isPopular) ?? packs.data?.[0];
  const packId = selected ?? popular?.id ?? null;
  const pack = packs.data?.find((p) => p.id === packId) ?? null;

  const pay = () => {
    if (!pack) return;
    topUp.mutate(
      { packId: pack.id },
      {
        onSuccess: (next) => {
          setIsCheckingOut(false);
          setAdded({ credits: pack.credits, balance: next.balance });
        },
      },
    );
  };

  return (
    <section className={styles.card} aria-labelledby="buy-heading">
      <div>
        <h2 id="buy-heading" className={styles.sectionTitle}>
          Buy credits
        </h2>
        <p className={styles.help}>Credits don’t expire. Bigger packs suit research teams.</p>
      </div>

      {added ? (
        <InlineNotification
          kind="success"
          title={`${formatCredits(added.credits)} added`}
          subtitle={`Your balance is now ${formatCredits(added.balance)}.`}
          lowContrast
          onCloseButtonClick={() => setAdded(null)}
          className={styles.notice}
        />
      ) : null}

      {packs.isPending ? (
        <div className={styles.packs}>
          {[0, 1, 2].map((i) => (
            <SkeletonPlaceholder key={i} className={styles.skeletonPack} />
          ))}
        </div>
      ) : packs.isError ? (
        <ErrorState
          title="Credit packs didn’t load"
          message={toUserMessage(packs.error)}
          onRetry={() => void packs.refetch()}
        />
      ) : (
        <>
          <fieldset className={styles.packFieldset}>
            <legend className={styles.packLegend}>Choose a pack</legend>
            <div className={styles.packs}>
              {packs.data.map((p) => (
                <RadioTile
                  key={p.id}
                  id={`wallet-${p.id}`}
                  name="wallet-pack"
                  value={p.id}
                  checked={packId === p.id}
                  onChange={(value) => setSelected(String(value))}
                  className={styles.pack}
                >
                  <PackContent pack={p} />
                </RadioTile>
              ))}
            </div>
          </fieldset>
          <div>
            <Button
              disabled={!pack}
              onClick={() => {
                topUp.reset();
                setIsCheckingOut(true);
              }}
            >
              Continue to checkout
            </Button>
          </div>
        </>
      )}

      {pack
        ? createPortal(
            <Modal
              open={isCheckingOut}
              modalHeading="Checkout"
              primaryButtonText={
                topUp.isPending ? 'Paying…' : `Pay ${formatCreditPrice(pack.credits)}`
              }
              secondaryButtonText="Cancel"
              primaryButtonDisabled={topUp.isPending}
              onRequestClose={() => setIsCheckingOut(false)}
              onRequestSubmit={pay}
              size="sm"
            >
              <Stack gap={6}>
                <dl className={styles.summary}>
                  <dt>Pack</dt>
                  <dd>{pack.label}</dd>
                  <dt>Credits</dt>
                  <dd>{formatCredits(pack.credits)}</dd>
                  <dt>Price</dt>
                  <dd>{formatCreditPrice(pack.credits)}</dd>
                  {wallet.data ? (
                    <>
                      <dt>Balance after</dt>
                      <dd>{formatCredits(wallet.data.balance + pack.credits)}</dd>
                    </>
                  ) : null}
                </dl>
                <RadioButtonGroup
                  legendText="Pay with"
                  name="payment-method"
                  orientation="vertical"
                  valueSelected={payment}
                  onChange={(value) => setPayment(String(value))}
                >
                  <RadioButton
                    id="pay-card"
                    value="card"
                    labelText="Saved card ending 4242 (demo)"
                  />
                  <RadioButton
                    id="pay-invoice"
                    value="invoice"
                    labelText="Invoice my company (demo)"
                  />
                </RadioButtonGroup>
                <p className={styles.help}>
                  Prototype: no payment is taken and no card details are collected.
                </p>
                {topUp.isError ? (
                  <InlineNotification
                    kind="error"
                    title="Payment didn’t go through"
                    subtitle={`${toUserMessage(topUp.error)} You haven’t been charged.`}
                    lowContrast
                    hideCloseButton
                  />
                ) : null}
              </Stack>
            </Modal>,
            document.body,
          )
        : null}
    </section>
  );
}

function PackContent({ pack }: { pack: CreditPack }) {
  return (
    <span className={styles.packContent}>
      <span className={styles.packHeader}>
        <span className={styles.packLabel}>{pack.label}</span>
        {pack.isPopular ? (
          <Tag type="warm-gray" size="sm">
            Most popular
          </Tag>
        ) : null}
      </span>
      <span className={styles.packCredits}>{formatCredits(pack.credits)}</span>
      <span className={styles.packPrice}>{formatCreditPrice(pack.credits)}</span>
    </span>
  );
}

function History() {
  const wallet = useWallet();
  const [filter, setFilter] = useState<TypeFilter>('all');
  const filterLabel = (f: TypeFilter | null) =>
    !f || f === 'all' ? 'All types' : TRANSACTION_LABELS[f];

  return (
    <section className={styles.card} aria-labelledby="history-heading">
      <div className={styles.historyHeader}>
        <h2 id="history-heading" className={styles.sectionTitle}>
          History
        </h2>
        <Dropdown
          id="history-filter"
          titleText="Show"
          label="All types"
          items={FILTERS}
          itemToString={filterLabel}
          selectedItem={filter}
          onChange={({ selectedItem }: { selectedItem: TypeFilter | null }) =>
            setFilter(selectedItem ?? 'all')
          }
          size="md"
          className={styles.filter}
        />
      </div>
      <AsyncBoundary
        query={wallet}
        errorTitle="Your history didn’t load"
        loading={<DataTableSkeleton columnCount={4} rowCount={4} showHeader={false} />}
        isEmpty={(data) => data.transactions.length === 0}
        empty={
          <EmptyState
            headingLevel={3}
            pictogram={<Receipt aria-hidden="true" />}
            title="No transactions yet"
            description="Top-ups, report purchases and research spend will show here."
            action={
              <Button as={Link} href="/library" kind="tertiary">
                Browse the library
              </Button>
            }
          />
        }
      >
        {(data) => {
          const rows = data.transactions.filter((t) => filter === 'all' || t.type === filter);
          if (rows.length === 0) {
            return (
              <p className={styles.help} role="status">
                No {filterLabel(filter).toLowerCase()} transactions yet.{' '}
                <Button kind="ghost" size="sm" onClick={() => setFilter('all')}>
                  Show all
                </Button>
              </p>
            );
          }
          return (
            <TableContainer className={styles.table}>
              <Table aria-label="Transactions">
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader className={styles.numeric}>Credits</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <time dateTime={t.at} title={formatDateTime(t.at)}>
                          {formatDate(t.at)}
                        </time>
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>
                        <Tag type={TYPE_TAG[t.type]} size="sm">
                          {TRANSACTION_LABELS[t.type]}
                        </Tag>
                      </TableCell>
                      <TableCell className={styles.numeric}>
                        {t.amount > 0 ? '+' : '−'}
                        {formatCredits(Math.abs(t.amount))}
                        {t.type === 'spent' ? (
                          <span className={styles.fromHeld}>from held credits</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </AsyncBoundary>
    </section>
  );
}
