// Copies self-hosted font files from node_modules into public/fonts (git-ignored).
// - IBM Plex Mono: code, IDs and citations, via Carbon's @font-face (ADR 0007).
// - Inter (UI) and Instrument Serif (display headings): @font-face in src/styles/_fonts.scss (ADR 0009).
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modules = join(root, 'node_modules');
const publicFonts = join(root, 'public', 'fonts');

const plexMono = join(modules, '@ibm', 'plex-mono', 'fonts');
if (existsSync(plexMono)) {
  for (const variant of ['complete', 'split']) {
    const to = join(publicFonts, 'plex-mono', 'fonts', variant, 'woff2');
    mkdirSync(to, { recursive: true });
    cpSync(join(plexMono, variant, 'woff2'), to, { recursive: true });
  }
}

const files = [
  ['@fontsource-variable/inter', 'inter', 'inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'inter', 'inter-latin-wght-italic.woff2'],
  ['@fontsource-variable/inter', 'inter', 'inter-latin-ext-wght-normal.woff2'],
  ['@fontsource/instrument-serif', 'instrument-serif', 'instrument-serif-latin-400-normal.woff2'],
  ['@fontsource/instrument-serif', 'instrument-serif', 'instrument-serif-latin-400-italic.woff2'],
];
for (const [pkg, dir, file] of files) {
  const from = join(modules, pkg, 'files', file);
  if (!existsSync(from)) continue;
  mkdirSync(join(publicFonts, dir), { recursive: true });
  copyFileSync(from, join(publicFonts, dir, file));
}
