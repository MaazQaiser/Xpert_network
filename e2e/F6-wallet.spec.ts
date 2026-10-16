import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

/** F6 happy path: Ayesha reviews her wallet, buys a credit pack and checks the history. */
test('F6: wallet → buy credits (mock checkout) → history', async ({ page }) => {
  await loginAs(page, /Ayesha Rahman/);
  await expect(
    page.getByRole('heading', { name: 'What are you researching today?' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Wallet: 390 credits' }).click();
  await expect(page.getByRole('heading', { name: 'Wallet', level: 1 })).toBeVisible();
  const balance = page.getByRole('region', { name: 'Balance' });
  await expect(balance.getByText('390 credits')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Transactions' })).toBeVisible();
  await expectNoAxeViolations(page);

  // Held credits are explained in place
  await page.getByRole('button', { name: 'What are held credits?' }).click();
  await expect(page.getByText(/When you accept a quote/)).toBeVisible();
  await page.keyboard.press('Escape');

  // Buy a pack
  await page.getByText('Research desk').click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Checkout' });
  await expect(dialog.getByText('1,890 credits')).toBeVisible();
  await expectNoAxeViolations(page);
  await dialog.getByRole('button', { name: 'Pay $7,500' }).click();

  await expect(page.getByText('1,500 credits added')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wallet: 1,890 credits' })).toBeVisible();
  const firstRow = page.getByRole('table', { name: 'Transactions' }).getByRole('row').nth(1);
  await expect(firstRow).toContainText('Research desk pack');
  await expect(firstRow).toContainText('+1,500 credits');

  // Filter the history
  await page.getByRole('combobox', { name: /Show/ }).click();
  await page.getByRole('option', { name: 'Report purchase' }).click();
  await expect(page.getByRole('table', { name: 'Transactions' }).getByRole('row')).toHaveCount(3);
  await expectNoAxeViolations(page);
});
