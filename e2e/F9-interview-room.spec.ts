import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

async function scenario(page: Page, name: string) {
  await page.getByRole('button', { name: 'Prototype controls' }).click();
  await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Hide prototype controls' }).click();
}

async function answer(page: Page, text: string) {
  await page.getByLabel('Your answer', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send answer' }).click();
}

const LONG =
  'For about eight years I ran sourcing for a chain of sixty cafés, buying green coffee and dairy from importers in Jeddah and Dubai.';

/** F9 ★ happy path: pre-flight → text interview with a follow-up, a compliance deflection,
 * a dropped connection and a pause → end early → edit a summary → submit. */
test('F9: pre-flight → room → deflection → resume → review → submitted', async ({ page }) => {
  await loginAs(page, /Sara Al-Mansouri/);
  await page.goto('/expert/calls/call_ksa_coffee_supply');
  const form = page.getByRole('form', { name: 'Screening questions' });
  await form.getByText('Yes', { exact: true }).click();
  await form.getByText('I worked for an operator (café, restaurant or retailer)').click();
  await form
    .getByLabel(/what will you be able to tell the client/)
    .fill('I sourced green coffee from three Saudi importers for 60 stores.');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await page.getByRole('link', { name: 'Start interview' }).click();

  // Pre-flight: voice needs the mic; the “Mic denied” state offers text instead.
  await expect(page.getByRole('heading', { name: 'What to expect' })).toBeVisible();
  await expect(page.getByText('Microphone works.')).toBeVisible();
  await page.getByText('Text', { exact: true }).click();
  await page.getByRole('button', { name: 'Start interview' }).click();
  await expect(
    page.getByText('Confirm you won’t share confidential or non-public information.'),
  ).toBeVisible();
  await page.getByText('I won’t share confidential or non-public information.').click();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Start interview' }).click();

  // Room: greeting and first question; a short answer gets a follow-up.
  const transcript = page.getByRole('list', { name: 'Transcript' });
  await expect(transcript.getByText(/tell me about your role in coffee supply/)).toBeVisible();
  await answer(page, 'Sourcing lead for a café chain.');
  await expect(
    transcript.getByText('Which parts of the supply chain were you directly responsible for?'),
  ).toBeVisible();
  await answer(page, LONG);
  await expect(transcript.getByText(/Roughly how large were the operations/)).toBeVisible();
  await expectNoAxeViolations(page);

  // Dropped connection: the reply is cut off; Resume retries the same answer.
  await scenario(page, 'Drop connection');
  await answer(
    page,
    'We sourced for about sixty stores across Saudi Arabia, mostly specialty grades from Ethiopia and Colombia.',
  );
  await expect(page.getByText('Connection lost')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(transcript.getByText(/that covers background/)).toBeVisible();

  // Skip with a reason, then answer.
  await page.getByRole('button', { name: 'Skip question' }).click();
  await page
    .getByRole('dialog', { name: 'Skip this question?' })
    .getByRole('button', { name: 'Skip question' })
    .click();
  await expect(transcript.getByText(/Skipped: I don’t know enough about this/)).toBeVisible();

  // Compliance moment: an exact internal figure is left out and a range requested.
  await answer(page, 'Our internal landed cost was exactly SAR 41.75 per kilo last quarter.');
  await expect(transcript.getByText('Compliance reminder')).toBeVisible();
  await expect(
    transcript.getByText('Shared an exact figure — removed from the record.'),
  ).toBeVisible();
  await answer(
    page,
    'Roughly SAR 35 to 45 a kilo for specialty grades, depending on origin and season, from what I saw.',
  );

  // Pause and resume at the same section.
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(transcript.getByText(/Welcome back\. We were on/)).toBeVisible();

  // End early → review → edit a summary → submit.
  await page.getByRole('button', { name: 'End early' }).click();
  await page
    .getByRole('dialog', { name: 'End the interview now?' })
    .getByRole('button', { name: 'End and review' })
    .click();
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible();
  await expect(page.getByText(/You ended early/)).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Edit summary' }).first().click();
  await page
    .getByLabel('Summary of background')
    .fill(
      'Ran sourcing for a 60-store café chain for eight years, buying through importers in Jeddah and Dubai.',
    );
  await page.getByRole('button', { name: 'Save summary' }).click();
  await expect(page.getByText('Edited by you')).toBeVisible();
  await page.getByRole('button', { name: 'Submit interview' }).click();

  await expect(
    page.getByRole('heading', { name: 'Under review — usually within 48 hours' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Go to earnings' }).click();
  await expect(page).toHaveURL(/\/expert\/earnings/);
});
