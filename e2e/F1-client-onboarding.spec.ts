import { expect, test } from '@playwright/test';
import { pickOptions, signUpAndVerify } from './support/accounts';
import { expectNoAxeViolations } from './support/axe';

/** F1 happy path: a new client answers 3 steps and lands in the goal chat with the goal set. */
test('F1: client onboarding → first goal deep-links into the goal chat', async ({ page }) => {
  await signUpAndVerify(page, 'client', 'Layla Nasser');

  await expect(page.getByRole('heading', { name: 'Set up your account' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await expectNoAxeViolations(page);

  // 1. About you
  await page.getByText('Investor or analyst').click();
  await page.getByRole('textbox', { name: 'Job title' }).fill('Associate');
  await page.getByLabel('Organisation (optional)').fill('Dune Ventures');
  await page.getByRole('button', { name: 'Continue' }).click();

  // 2. What you research
  await expect(page.getByRole('heading', { name: 'What you research' })).toBeVisible();
  await pickOptions(page, 'Industries', ['Specialty coffee', 'Grocery retail']);
  await pickOptions(page, 'Regions', ['Saudi Arabia']);
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Continue' }).click();

  // 3. First goal → /ask?goal=invest
  await expect(page.getByRole('heading', { name: 'Your first goal' })).toBeVisible();
  await page.getByText('Invest in a company').click();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Start my first brief' }).click();

  await expect(page).toHaveURL(/\/ask\/brf_\w+/);
  await expect(page.getByText(/Hi Layla\. Let’s scope your research/)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Example objectives' })).toBeVisible();
});
