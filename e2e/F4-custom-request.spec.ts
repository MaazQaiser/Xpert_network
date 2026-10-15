import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';

async function runScenario(page: Page, name: string, times = 1) {
  await page.getByRole('button', { name: 'Prototype controls' }).click();
  for (let i = 0; i < times; i += 1) await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Hide prototype controls' }).click();
}

/** F4 ★ happy path: Ayesha asks about her quote, accepts it, follows progress, reads the result. */
test('F4: quote → question → accept (hold) → progress → delivered report', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Ayesha Rahman/ }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Ayesha' })).toBeVisible();

  await page.getByRole('link', { name: 'Requests', exact: true }).click();
  await expect(page.getByRole('heading', { name: /In progress/ })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('link', { name: /Qahwa House: store pipeline/ }).click();

  // Quote
  const quote = page.getByRole('region', { name: 'Your quote' });
  await expect(quote.getByText('180 credits', { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByLabel('Your question', { exact: true }).fill('Could it be cheaper?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/reduce the scope to 4 experts/)).toBeVisible();

  await quote.getByRole('button', { name: 'Accept and hold 180 credits' }).click();
  const dialog = page.getByRole('dialog', { name: 'Accept this quote?' });
  await expect(dialog.getByText('210 credits')).toBeVisible();
  await dialog.getByRole('button', { name: 'Accept and hold 180 credits' }).click();

  // In progress
  await expect(page.getByRole('heading', { name: 'Research in progress' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wallet: 210 credits' })).toBeVisible();
  await runScenario(page, 'Advance request', 2);
  await expect(page.getByText('Former regional operations director, coffee chain')).toBeVisible();
  await expectNoAxeViolations(page);

  // Delivered
  await runScenario(page, 'Advance request', 4);
  await expect(page.getByRole('heading', { name: 'Your research is ready' })).toBeVisible();
  await page.getByText('5', { exact: true }).click();
  await expect(page.getByText('Thanks — you rated this 5 out of 5.')).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('link', { name: 'Open report' }).click();
  await expect(
    page.getByRole('heading', { name: /How have Qahwa House sales trended/ }),
  ).toBeVisible();

  // Wallet shows the hold and the spend
  await page.goto('/wallet');
  const table = page.getByRole('table', { name: 'Transactions' });
  await expect(
    table.getByText('Spent: Qahwa House: store pipeline and competitive response'),
  ).toBeVisible();
  await expect(
    table.getByText('Held: Qahwa House: store pipeline and competitive response'),
  ).toBeVisible();
});
