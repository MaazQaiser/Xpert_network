import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';

/** F0 happy paths: email sign-up → verify, forgot password → reset, log in with Google. */

test('F0: sign up with email → verify email → onboarding', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign up' }).first().click();

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByText('I need research').click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/sign-up\?role=client/);
  await page.getByLabel('Full name').fill('Layla Nasser');
  await page.getByLabel('Work email').fill(`layla+${Date.now()}@nasser.example`);
  await page.getByLabel('Password', { exact: true }).fill('harbour2026');
  await page.getByText('I agree to the terms of use and privacy notice').click();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.getByRole('button', { name: 'Resend email' }).click();
  await expect(page.getByText('Email sent again')).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Open the email link (prototype)' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('F0: forgot password → reset link → new password', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

  await page.getByLabel('Email').fill('bilal@haddadhospitality.example');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await page.getByRole('link', { name: 'Open the reset link (prototype)' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('harbour2026');
  await page.getByLabel('Repeat new password').fill('harbour2026');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Password updated')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('F0: log in with Google (mocked account chooser)', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Choose an account' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Ayesha Rahman/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'What are you researching today?' }),
  ).toBeVisible();
});
