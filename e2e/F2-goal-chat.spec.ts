import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** F2 ★ happy path: Bilal scopes a Riyadh café expansion and buys reports + requests a quote. */

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test('F2: goal chat → needs summary → options → checkout', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Bilal Haddad/ }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Bilal' })).toBeVisible();

  await page.getByRole('link', { name: 'Describe a goal' }).click();
  await expect(page.getByText(/Hi Bilal\. Let’s scope your research/)).toBeVisible();
  await expectNoAxeViolations(page);

  // 1. Goal
  await page.getByRole('button', { name: 'Expand to a new region' }).click();
  await expect(page.getByRole('group', { name: 'Example objectives' })).toBeVisible();
  await page.getByRole('button', { name: /open 3 café franchises in Riyadh/ }).click();
  await expect(
    page.getByRole('combobox', { name: /Search companies, regions, industries/ }),
  ).toBeVisible();

  // 2. Subject — free text with "Did you mean…"
  await page.getByRole('textbox', { name: 'Your reply' }).fill('Jed');
  await page.getByRole('textbox', { name: 'Your reply' }).press('Enter');
  await expect(page.getByText('Did you mean one of these for “Jed”?')).toBeVisible();
  await page.getByRole('button', { name: /^Riyadh$/ }).click();
  await expect(page.getByRole('button', { name: 'Remove Riyadh' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 3. Questions
  await expect(page.getByRole('button', { name: 'Use 5 questions' })).toBeVisible();
  await page.getByRole('button', { name: 'Use 5 questions' }).click();

  // 4. Constraints (defaults)
  await expect(page.getByLabel('Answers needed by')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // 5. Needs summary
  await expect(page.getByRole('heading', { name: 'Research brief', level: 3 })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Confirm needs' }).click();
  await expect(page.getByRole('group', { name: 'How would you like to proceed?' })).toBeVisible({
    timeout: 10_000,
  });

  // 6. Options + coverage map
  await expect(page.getByRole('heading', { name: 'Coverage map' })).toBeVisible();
  await expectNoAxeViolations(page);
  await expect(page.getByText('Partly covered').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: /Buy reports and request a quote/ })).toBeVisible();

  // 7. Checkout
  await page.getByRole('button', { name: /Buy reports and request a quote/ }).click();
  await expect(page.getByText('Reports purchased and quote requested')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track your request' })).toBeVisible();
});
