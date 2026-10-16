import { expect, type Page } from '@playwright/test';

/** Logs in as a demo persona from the login page (the list may sit behind “Demo accounts”). */
export async function loginAs(page: Page, name: RegExp, path = '/login'): Promise<void> {
  await page.goto(path);
  const persona = page.getByRole('button', { name });
  const opener = page.getByRole('button', { name: 'Demo accounts' });
  await expect(persona.or(opener).first()).toBeVisible();
  if (!(await persona.isVisible())) await opener.click();
  await persona.click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}
