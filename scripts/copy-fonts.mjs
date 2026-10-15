// Copies IBM Plex woff2 files from node_modules into public/fonts so Carbon's
// @font-face rules (configured in src/styles/globals.scss) can load them.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const families = ['sans', 'mono'];

for (const family of families) {
  const pkg = join(root, 'node_modules', '@ibm', `plex-${family}`, 'fonts');
  if (!existsSync(pkg)) continue;
  for (const variant of ['complete', 'split']) {
    const from = join(pkg, variant, 'woff2');
    const to = join(root, 'public', 'fonts', `plex-${family}`, 'fonts', variant, 'woff2');
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
  }
}
