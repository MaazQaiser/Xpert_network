import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './support/axe';
import { loginAs } from './support/login';

/** F5 happy path: Ayesha makes a folder, files two items in it, labels one, archives and restores. */
test('F5: new folder → bulk move → label → archive → restore', async ({ page }) => {
  await loginAs(page, /Ayesha Rahman/);
  await expect(page.getByRole('heading', { name: 'Welcome back, Ayesha' })).toBeVisible();

  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  const table = page.getByRole('table', { name: 'All items' });
  await expect(table.getByRole('link')).toHaveCount(3);
  await expectNoAxeViolations(page);

  // New folder, which opens straight away and explains how to fill it.
  await page.getByRole('button', { name: 'New folder' }).click();
  const create = page.getByRole('dialog', { name: 'New folder' });
  await create.getByLabel('Folder name').fill('Riyadh launch');
  await create.getByRole('button', { name: 'Create folder' }).click();
  await expect(page.getByRole('heading', { name: 'Riyadh launch', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This folder is empty' })).toBeVisible();
  await expect(page).toHaveURL(/view=fld_/);

  // Bulk move from All items.
  await page.getByRole('button', { name: 'Go to All items' }).click();
  await page.locator('label', { hasText: 'Select UAE consumer retail' }).click();
  await page.locator('label', { hasText: 'Select Qahwa House: store pipeline' }).click();
  await page.getByRole('button', { name: 'Move to folder' }).click();
  const move = page.getByRole('dialog', { name: 'Move 2 items' });
  await move.getByLabel('Move to').selectOption({ label: 'Riyadh launch' });
  await move.getByRole('button', { name: 'Move' }).click();
  await expect(page.getByText('Moved 2 items to “Riyadh launch”.')).toBeVisible();

  await page.getByRole('treeitem', { name: /^Riyadh launch/ }).click();
  await expect(page.getByRole('table', { name: 'Riyadh launch' }).getByRole('link')).toHaveCount(2);

  // Label one item from its row menu.
  await page
    .getByRole('button', { name: 'Actions for UAE consumer retail: footfall and spending, 2026' })
    .click();
  await page.getByRole('menuitem', { name: 'Labels' }).click();
  const labels = page.getByRole('dialog', { name: /Labels for/ });
  await labels.getByText('Shared with CFO').click();
  await labels.getByRole('button', { name: 'Save labels' }).click();
  await expect(
    page.getByRole('table', { name: 'Riyadh launch' }).getByText('Shared with CFO'),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  // Archive, find it in Archived, restore it.
  await page
    .getByRole('button', { name: 'Actions for UAE consumer retail: footfall and spending, 2026' })
    .click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(
    page.getByText('Archived “UAE consumer retail: footfall and spending, 2026”.'),
  ).toBeVisible();
  await page.getByRole('treeitem', { name: /^Archived/ }).click();
  await page
    .getByRole('button', { name: 'Actions for UAE consumer retail: footfall and spending, 2026' })
    .click();
  await page.getByRole('menuitem', { name: 'Restore' }).click();
  await expect(page.getByRole('heading', { name: 'Nothing archived' })).toBeVisible();

  // The organisation survives a reload (mock store in localStorage).
  await page.reload();
  await page.getByRole('treeitem', { name: /^Riyadh launch/ }).click();
  await expect(page.getByRole('table', { name: 'Riyadh launch' }).getByRole('link')).toHaveCount(2);
});
