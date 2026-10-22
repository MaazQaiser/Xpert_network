import { beforeEach, describe, expect, it } from 'vitest';
import { contrastRatio, keepAlpha, toHex } from './color';
import {
  buildOverrideCss,
  exportOverrides,
  getOverrides,
  resetOverrides,
  setTokenOverride,
  STORAGE_KEY,
} from './overrides';

describe('token overrides', () => {
  beforeEach(() => resetOverrides());

  it('stores edits per theme, persists them and writes the override stylesheet', () => {
    setTokenOverride('light', '--cds-button-primary', '#123456');
    setTokenOverride('shared', '--cds-heading-05-font-size', '2.5rem');

    expect(getOverrides().light).toEqual({ '--cds-button-primary': '#123456' });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').shared).toEqual({
      '--cds-heading-05-font-size': '2.5rem',
    });
    const css = document.getElementById('xpert-design-token-overrides')?.textContent ?? '';
    expect(css).toContain(
      "html:root:not([data-carbon-theme='g100']) {\n  --cds-button-primary: #123456;",
    );
    expect(css).toContain('html:root {\n  --cds-heading-05-font-size: 2.5rem;');
  });

  it('refuses values that could break out of the stylesheet', () => {
    setTokenOverride('light', '--cds-focus', 'red; } body { display: none');
    setTokenOverride('light', 'color', '#fff');
    expect(getOverrides().light).toEqual({});
  });

  it('clears a single token', () => {
    setTokenOverride('dark', '--cds-focus', '#94a3b8');
    setTokenOverride('dark', '--cds-focus', null);
    expect(getOverrides().dark).toEqual({});
    expect(buildOverrideCss(getOverrides())).toBe('');
  });

  it('exports edits grouped by where they belong in src/styles', () => {
    setTokenOverride('dark', '--cds-link-primary', '#e8925a');
    expect(exportOverrides(getOverrides())).toContain('$dark-overrides');
    expect(exportOverrides(getOverrides())).toContain('--cds-link-primary: #e8925a;');
  });

  it('accepts card shadow presets on shared scope', () => {
    setTokenOverride('shared', '--pt-glass-shadow', 'none');
    expect(getOverrides().shared['--pt-glass-shadow']).toBe('none');
    setTokenOverride(
      'shared',
      '--pt-glass-shadow',
      '0 0 0 1px var(--cds-border-subtle-01), 0 0.75rem 2rem var(--cds-shadow)',
    );
    expect(getOverrides().shared['--pt-glass-shadow']).toContain('var(--cds-shadow)');
  });
});

describe('colour helpers', () => {
  it('normalises hex and rgb values', () => {
    expect(toHex('#abc')).toBe('#aabbcc');
    expect(toHex('rgba(55, 53, 47, 0.05)')).toBe('#37352f');
    expect(toHex('var(--x)')).toBeNull();
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#37352f', '#fff')).toBeGreaterThan(12);
  });

  it('keeps alpha when picking a new hex from the colour input', () => {
    expect(keepAlpha('#ffffff', 'rgba(15, 15, 15, 0.08)')).toBe('rgba(255, 255, 255, 0.08)');
    expect(keepAlpha('#000000', '#37352f')).toBe('#000000');
  });
});
