import { expect, type Page } from '@playwright/test';

/** F0 shortcut for later flows: sign up with email and verify, landing on onboarding. */
export async function signUpAndVerify(page: Page, role: 'client' | 'expert', name: string) {
  await page.goto(`/sign-up?role=${role}`);
  await page.getByLabel('Full name').fill(name);
  await page
    .getByLabel(role === 'client' ? 'Work email' : 'Email', { exact: true })
    .fill(`${name.split(' ')[0]!.toLowerCase()}+${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('harbour2026');
  await page.getByText('I agree to the terms of use and privacy notice').click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.getByRole('button', { name: 'Open the email link (prototype)' }).click();
}

/** Picks options in a Carbon FilterableMultiSelect by typing to filter. */
export async function pickOptions(page: Page, label: string, options: string[]) {
  const combobox = page.getByRole('combobox', { name: label });
  for (const option of options) {
    await combobox.click();
    await combobox.fill(option);
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  await combobox.press('Escape');
}
