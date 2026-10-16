import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

/** F8 happy path: Sara finds a strong match, filters, applies and is approved straight away. */
test('F8: browse → filter → call detail → screening → approved', async ({ page }) => {
  await loginAs(page, /Sara Al-Mansouri/);
  await expect(page.getByRole('heading', { name: 'Welcome, Sara' })).toBeVisible();

  await page.getByRole('link', { name: 'Open calls', exact: true }).click();
  const list = page.getByRole('list', { name: 'Open calls' });
  await expect(list.getByRole('article')).toHaveCount(6);
  await expectNoAxeViolations(page);

  await page.getByRole('combobox', { name: 'Fee' }).click();
  await page.getByRole('option', { name: '$300 or more' }).click();
  await expect(page).toHaveURL(/minFee=300/);
  await expect(list.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(list.getByRole('article')).toHaveCount(6);

  await list.getByRole('link', { name: 'Specialty coffee supply chains in Saudi Arabia' }).click();
  await expect(page.getByRole('heading', { name: 'Why you’re a strong match' })).toBeVisible();
  await page.getByRole('link', { name: 'Apply' }).click();

  const form = page.getByRole('form', { name: 'Screening questions' });
  await form.getByText('Yes', { exact: true }).click();
  await form.getByText('I worked for an operator (café, restaurant or retailer)').click();
  await form
    .getByLabel(/what will you be able to tell the client/)
    .fill('I sourced green coffee from three Saudi importers for 60 stores.');
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Submit application' }).click();

  await expect(page.getByRole('heading', { name: 'You’re in' })).toBeVisible();
  await expect(page.getByText('Approved · interview ready')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start interview' })).toHaveAttribute(
    'href',
    /\/expert\/interviews\/int_/,
  );
});
