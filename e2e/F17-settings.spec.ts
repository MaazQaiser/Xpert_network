import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';

/** F17 happy path: notification centre, then profile, notifications, security and theme. */
test('F17: notification centre → settings tabs → dark theme', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Bilal Haddad/ }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Bilal' })).toBeVisible();

  // Notification centre (HeaderPanel)
  await page.getByRole('button', { name: 'Notifications, 1 unread' }).click();
  const panel = page.getByRole('region', { name: 'Notifications' });
  await expect(panel.getByText('New report: Riyadh café supply chain')).toBeVisible();
  await expectNoAxeViolations(page);
  await panel.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  // The badge clears optimistically; wait until the mock backend has saved it too.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('proptyop.demo.v2') ?? '{}') as {
          notifications?: Record<string, { read: boolean }[]>;
        };
        return state.notifications?.usr_bilal?.every((n) => n.read);
      }),
    )
    .toBe(true);

  // A new notification arrives (scenario) → badge + toast
  await page.getByRole('button', { name: 'Prototype controls' }).click();
  await page.getByRole('button', { name: 'Push notification' }).click();
  await page.getByRole('button', { name: 'Hide prototype controls' }).click();
  await expect(page.getByRole('status').getByText('Your quote is ready')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible();
  await page.getByRole('button', { name: 'Notifications, 1 unread' }).click();
  await panel.getByRole('link', { name: 'Notification settings' }).click();

  // Notifications tab (deep-linked)
  await expect(page).toHaveURL(/\/settings\?tab=notifications/);
  await expect(page.getByRole('tab', { name: 'Notifications' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('group', { name: 'Product news' }).getByText('In app').click();
  await page.getByText('Weekly summary (Sunday)').click();
  await page.getByRole('button', { name: 'Save notification settings' }).click();
  await expect(page.getByText('Notification settings saved')).toBeVisible();
  await expectNoAxeViolations(page);

  // Profile tab
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByLabel('Job title').fill('Franchise owner & operator');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.getByText('Details saved')).toBeVisible();
  await expectNoAxeViolations(page);

  // Security tab (mocked)
  await page.getByRole('tab', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Sign out Edge on Windows' }).click();
  await expect(page.getByText('Edge on Windows')).toHaveCount(0);
  await expectNoAxeViolations(page);

  // Appearance → dark theme
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-carbon-theme', 'g100');
  await expectNoAxeViolations(page);
});
