/** Prototype pricing: 1 credit ≈ US$5. Shown next to credits (open question #3, decided 2026-10-15). */
export const CREDIT_VALUE_USD = 5;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const count = new Intl.NumberFormat('en-US');

export function formatCredits(credits: number): string {
  return `${count.format(credits)} ${Math.abs(credits) === 1 ? 'credit' : 'credits'}`;
}

export function formatCurrencyEquivalent(credits: number): string {
  return `≈ ${usd.format(credits * CREDIT_VALUE_USD)}`;
}

/** "120 credits (≈ $600)" */
export function formatCreditsWithCurrency(credits: number): string {
  return `${formatCredits(credits)} (${formatCurrencyEquivalent(credits)})`;
}

/** "$2,500" for the price of N credits. */
export function formatCreditPrice(credits: number): string {
  return usd.format(credits * CREDIT_VALUE_USD);
}
