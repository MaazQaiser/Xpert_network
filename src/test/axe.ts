import { axe } from 'vitest-axe';
import { expect } from 'vitest';

/** Fails with a readable list when axe finds WCAG violations (CLAUDE.md non-negotiable 3). */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe(container, {
    // Color contrast can't be computed in jsdom; Carbon tokens cover it (DESIGN_SYSTEM §8).
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`);
  expect(summary).toEqual([]);
}
