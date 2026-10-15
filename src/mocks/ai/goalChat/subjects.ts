import type { Subject } from '@/features/goal-chat';
import { ALL_SUBJECTS } from '../../fixtures/entities';

export type SubjectResolution =
  | { kind: 'resolved'; subject: Subject }
  | { kind: 'ambiguous'; candidates: Subject[] }
  | { kind: 'unknown'; candidates: Subject[] };

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ALIASES: Record<string, string> = {
  ksa: 'rg_ksa',
  saudi: 'rg_ksa',
  uae: 'rg_uae',
  emirates: 'rg_uae',
  gulf: 'rg_gcc',
  coffee: 'in_specialty_coffee',
  cafe: 'in_specialty_coffee',
  cafes: 'in_specialty_coffee',
  franchise: 'in_fnb_franchising',
  grocery: 'in_grocery',
  supermarket: 'in_grocery',
};

/**
 * Resolves free text to a known company / region / industry / time frame.
 * Exact or alias match → resolved; several partial matches → "Did you mean…".
 */
export function resolveSubject(text: string): SubjectResolution {
  const query = normalise(text);
  if (!query) return { kind: 'unknown', candidates: [] };

  const exact = ALL_SUBJECTS.find((s) => normalise(s.label) === query);
  if (exact) return { kind: 'resolved', subject: exact };

  const aliasId = ALIASES[query];
  const alias = aliasId ? ALL_SUBJECTS.find((s) => s.id === aliasId) : undefined;
  if (alias) return { kind: 'resolved', subject: alias };

  const words = query.split(' ').filter((w) => w.length >= 3);
  const scored = ALL_SUBJECTS.map((subject) => {
    const label = normalise(subject.label);
    const labelWords = label.split(' ');
    let score = 0;
    if (query.includes(label)) score += 3;
    for (const word of words) {
      if (labelWords.some((lw) => lw.startsWith(word))) score += 2;
      else if (label.includes(word)) score += 1;
    }
    return { subject, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const [best, second] = scored;
  if (!best) return { kind: 'unknown', candidates: [] };
  if (!second || best.score >= second.score + 2) {
    if (best.score >= 3) return { kind: 'resolved', subject: best.subject };
  }
  const candidates = scored.slice(0, 4).map((entry) => entry.subject);
  return best.score >= 2 ? { kind: 'ambiguous', candidates } : { kind: 'unknown', candidates };
}
