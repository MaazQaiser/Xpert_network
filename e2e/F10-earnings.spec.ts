import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

// The standard example IBAN from banking documentation; not a real account.
const EXAMPLE_IBAN = 'AE07 0331 2345 6789 0123 456';

async function scenario(page: Page, name: string) {
  await page.getByRole('button', { name: 'Prototype controls' }).click();
  await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Hide prototype controls' }).click();
}

/** F10 happy path: Sara checks her earnings, changes her payout method and gets paid. */
test('F10: totals → payout method → request payout → paid', async ({ page }) => {
  await loginAs(page, /Sara Al-Mansouri/);
  await page.getByRole('link', { name: 'Earnings', exact: true }).click();

  const totals = page.getByRole('region', { name: 'Totals' });
  await expect(totals.getByText('$200').first()).toBeVisible();
  await expect(totals.getByText('$550')).toBeVisible();
  await expectNoAxeViolations(page);

  // Change the payout method; a bad IBAN is caught before saving.
  await page
    .getByRole('region', { name: 'Payout method' })
    .getByRole('button', { name: 'Change' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Change payout method' });
  await dialog.getByLabel('IBAN').fill('1234');
  await dialog.getByRole('button', { name: 'Save payout method' }).click();
  await expect(dialog.getByText(/Enter an IBAN like/)).toBeVisible();
  await dialog.getByLabel('IBAN').fill(EXAMPLE_IBAN);
  await dialog.getByRole('button', { name: 'Save payout method' }).click();
  await expect(
    page.getByRole('region', { name: 'Payout method' }).getByText(/IBAN ending 3456/),
  ).toBeVisible();

  // Request everything available, then the toolbar plays the payout landing.
  await totals.getByRole('button', { name: 'Request payout' }).click();
  await page
    .getByRole('dialog', { name: 'Request a payout of $200?' })
    .getByRole('button', { name: 'Request payout' })
    .click();
  await expect(page.getByText('Payout requested')).toBeVisible();
  await expect(totals.getByText('$200 on its way')).toBeVisible();

  await scenario(page, 'Payout paid');
  await expect(totals.getByText('$750')).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Payouts' })
      .getByText(/^Paid /)
      .first(),
  ).toBeVisible();
});
