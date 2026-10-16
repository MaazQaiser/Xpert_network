import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

/** F3 ★ happy path: Bilal finds a report, buys it with credits, reads it and asks it questions. */
test('F3: library → preview → buy → read → ask this report', async ({ page }) => {
  await loginAs(page, /Bilal Haddad/);
  await expect(page.getByRole('heading', { name: 'Welcome back, Bilal' })).toBeVisible();

  // Library
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Food & beverage/ })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('searchbox', { name: 'Search the library' }).fill('riyadh');
  await expect(page).toHaveURL(/q=riyadh/);
  await page.getByRole('link', { name: /Supplying a café in Riyadh/ }).click();

  // Preview
  await expect(page.getByRole('heading', { name: 'What’s inside' })).toBeVisible();
  await expect(page.getByText('Who you’ll hear from')).toBeVisible();
  await expectNoAxeViolations(page);
  const aside = page.getByRole('complementary', { name: 'Price and purchase' });
  await expect(aside.getByText('Your balance: 420 credits')).toBeVisible();
  await aside.getByRole('button', { name: 'Buy for 150 credits' }).click();
  const dialog = page.getByRole('dialog', { name: 'Buy this report?' });
  await expect(dialog.getByText('270 credits')).toBeVisible();
  await dialog.getByRole('button', { name: 'Buy for 150 credits' }).click();

  // Viewer
  await expect(page).toHaveURL(/\/library\/lib_riyadh_cafe_supply\/read/);
  await expect(page.getByText('Report purchased')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wallet: 270 credits' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Report contents' })).toBeVisible();
  await expectNoAxeViolations(page);

  // Ask this report
  await page.getByRole('button', { name: 'Ask this report' }).click();
  const panel = page.getByRole('region', { name: 'Ask this report' });
  await panel.getByRole('button', { name: 'Summarise the key findings' }).click();
  await expect(panel.getByText('Sources')).toBeVisible();
  await panel.getByRole('button', { name: /^Source 2: Lead times/ }).click();
  await expect(
    page.getByRole('heading', { name: /Lead times for equipment and fit-out/ }),
  ).toBeFocused();

  await panel.getByLabel('Your question').fill('What is the weather like in Abha?');
  await panel.getByRole('button', { name: 'Ask' }).click();
  await expect(panel.getByText(/I couldn’t find this in this report/)).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Request research on this' })).toBeVisible();
  await expectNoAxeViolations(page);
});
