import { expect, test } from '@playwright/test';
import { pickOptions, signUpAndVerify } from './support/accounts';
import { expectNoAxeViolations } from './support/axe';

/** F7 happy path: a new expert completes the 5-step profile, waits for review, gets approved. */
test('F7: expert onboarding → pending approval → approved', async ({ page }) => {
  await signUpAndVerify(page, 'expert', 'Karim Aziz');

  await expect(page.getByRole('heading', { name: 'Set up your expert profile' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);

  // 1. Basics
  await page.getByLabel('Headline').fill('Former regional operations director, QSR');
  await page.getByLabel('Years of relevant experience').fill('18');
  await page.getByLabel('Country you’re based in').selectOption({ label: 'Saudi Arabia' });
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // 2. Work history
  await expect(page.getByRole('heading', { name: 'Work history' })).toBeVisible();
  await page.getByLabel('Company', { exact: true }).fill('Bayt Burger');
  await page.getByLabel('Role', { exact: true }).fill('Regional operations director');
  await page.getByLabel('From', { exact: true }).selectOption('2016');
  await page.getByLabel('To', { exact: true }).selectOption('2025');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // 3. Expertise & regions
  await expect(page.getByRole('heading', { name: 'Expertise & regions' })).toBeVisible();
  await pickOptions(page, 'Industries', ['Quick-service restaurants']);
  await pickOptions(page, 'Topics you know best', ['Store operations', 'Franchise development']);
  await pickOptions(page, 'Regions', ['Saudi Arabia', 'Riyadh']);
  await pickOptions(page, 'Interview languages', ['English', 'Arabic']);
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // 4. Compliance & conflicts
  await expect(page.getByRole('heading', { name: 'Compliance & conflicts' })).toBeVisible();
  await page.getByLabel('Companies you can’t discuss (optional)').fill('Bayt Burger');
  await page.getByText(/I won’t share confidential information/).click();
  await page.getByText(/I won’t share material non-public information/).click();
  await page.getByText(/My profile is accurate/).click();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // 5. Submit
  await expect(page.getByRole('heading', { name: 'Check and submit' })).toBeVisible();
  await expect(
    page.getByText('Regional operations director, Bayt Burger · 2016–2025'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Submit for review' }).click();

  // Pending approval
  await expect(
    page.getByRole('heading', { name: 'Thanks — we’re reviewing your profile' }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  // Scenario: an admin approves (F12 later)
  await page.getByRole('button', { name: 'Prototype controls' }).click();
  await page.getByRole('button', { name: 'Approve expert' }).click();
  await page.getByRole('button', { name: 'Hide prototype controls' }).click();
  await expect(page.getByRole('heading', { name: 'You’re approved' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to expert home' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome, Karim' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByText('Store operations')).toBeVisible();
});
