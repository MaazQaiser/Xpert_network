import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** WCAG 2.2 AA scan of the current page (CLAUDE.md non-negotiable 3). */
export async function expectNoAxeViolations(page: Page) {
  // Contrast is measured mid-transition otherwise (modals and panels fade in).
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .every((animation) => animation.playState !== 'running'),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(
      (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}
