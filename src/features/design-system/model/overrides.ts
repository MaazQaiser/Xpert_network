import { z } from 'zod';

/** Colour edits are per theme; type and shape edits apply to both themes. */
export type OverrideScope = 'light' | 'dark' | 'shared';
export type TokenOverrides = Record<OverrideScope, Record<string, string>>;

export const STORAGE_KEY = 'xpert.design-tokens';
const STYLE_ID = 'xpert-design-token-overrides';

const tokenName = z.string().regex(/^--[a-z0-9-]+$/);
// Values end up inside a <style> tag, so braces, semicolons, quotes and slashes are refused.
const tokenValue = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[#a-zA-Z0-9.,%()\s-]+$/);

const overridesSchema = z.object({
  light: z.record(tokenName, tokenValue),
  dark: z.record(tokenName, tokenValue),
  shared: z.record(tokenName, tokenValue),
});

export const EMPTY_OVERRIDES: TokenOverrides = { light: {}, dark: {}, shared: {} };

export function isSafeTokenValue(value: string) {
  return tokenValue.safeParse(value).success;
}

let current: TokenOverrides = EMPTY_OVERRIDES;
let hasLoaded = false;
const listeners = new Set<() => void>();

function readStorage(): TokenOverrides {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_OVERRIDES;
    const parsed = overridesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_OVERRIDES;
  } catch {
    return EMPTY_OVERRIDES;
  }
}

export function getOverrides(): TokenOverrides {
  if (!hasLoaded && typeof window !== 'undefined') {
    current = readStorage();
    hasLoaded = true;
  }
  return current;
}

export function getServerOverrides(): TokenOverrides {
  return EMPTY_OVERRIDES;
}

export function subscribeOverrides(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Builds the override stylesheet. The `html:root` selectors outrank the theme blocks in
 * globals.scss (`:root`, `:root[data-carbon-theme='g100']`) without !important.
 */
export function buildOverrideCss(overrides: TokenOverrides): string {
  const block = (selector: string, tokens: Record<string, string>) => {
    const entries = Object.entries(tokens);
    if (entries.length === 0) return '';
    return `${selector} {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`;
  };
  return [
    block('html:root', overrides.shared),
    block("html:root:not([data-carbon-theme='g100'])", overrides.light),
    block("html:root[data-carbon-theme='g100']", overrides.dark),
  ].join('');
}

/** Writes the current overrides into a <style> tag in <head>. */
export function applyOverrides() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildOverrideCss(getOverrides());
}

function commit(next: TokenOverrides) {
  current = next;
  hasLoaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the edit still applies for this page view.
  }
  applyOverrides();
  listeners.forEach((listener) => listener());
}

/** Sets one token, or clears it when `value` is null. Unsafe values are ignored. */
export function setTokenOverride(scope: OverrideScope, name: string, value: string | null) {
  if (!tokenName.safeParse(name).success) return;
  const others = Object.fromEntries(
    Object.entries(getOverrides()[scope]).filter(([key]) => key !== name),
  );
  if (value === null) {
    commit({ ...getOverrides(), [scope]: others });
    return;
  }
  const parsed = tokenValue.safeParse(value);
  if (!parsed.success) return;
  commit({ ...getOverrides(), [scope]: { ...others, [name]: parsed.data } });
}

export function resetOverrides() {
  commit(EMPTY_OVERRIDES);
}

/** Re-reads storage, e.g. after another tab changed the tokens. */
export function reloadOverrides() {
  current = readStorage();
  hasLoaded = true;
  applyOverrides();
  listeners.forEach((listener) => listener());
}

export function countOverrides(overrides: TokenOverrides) {
  return (
    Object.keys(overrides.light).length +
    Object.keys(overrides.dark).length +
    Object.keys(overrides.shared).length
  );
}

/** A snippet to make the edits permanent in src/styles. */
export function exportOverrides(overrides: TokenOverrides): string {
  const section = (title: string, tokens: Record<string, string>) => {
    const entries = Object.entries(tokens);
    if (entries.length === 0) return null;
    return [`// ${title}`, ...entries.map(([name, value]) => `${name}: ${value};`)].join('\n');
  };
  const sections = [
    section(
      'Light theme: src/styles/_themes.scss → $light-overrides (drop the --cds- prefix; button tokens go in -button-tokens)',
      overrides.light,
    ),
    section(
      'Dark theme: src/styles/_themes.scss → $dark-overrides (drop the --cds- prefix; button tokens go in -button-tokens)',
      overrides.dark,
    ),
    section(
      'Both themes: type and shape custom properties, add to app-theme in _themes.scss',
      overrides.shared,
    ),
  ].filter((value): value is string => value !== null);
  return sections.length > 0 ? sections.join('\n\n') : '// No changes yet.';
}
