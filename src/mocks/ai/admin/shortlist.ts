import {
  DEFAULT_RANKING_WEIGHTS,
  type MatchResult,
  type Project,
  type QuestionCoverage,
  type Shortlist,
  type ShortlistSize,
  type ShortlistedExpert,
} from '@/features/admin';
import { PRJ_1042_TOPICS } from '../../fixtures/admin/prj1042';

const QUESTION_LABELS = PRJ_1042_TOPICS;

function coverageFor(
  project: Project,
  experts: ShortlistedExpert[],
): { coverage: QuestionCoverage[]; gap: string | null } {
  const questions = project.questions.slice(0, 8);
  const coverage = questions.map((q, index) => {
    const coveredBy = experts.filter((e) => e.questionsCovered > index).length;
    return {
      questionId: q.id,
      label: QUESTION_LABELS[index] ?? `Q${index + 1}`,
      coveredBy,
      of: experts.length || 1,
    };
  });
  const weak = coverage
    .map((c, i) => ({ ...c, index: i + 1 }))
    .filter((c) => c.coveredBy <= 2)
    .sort((a, b) => a.coveredBy - b.coveredBy)[0];
  const gap = weak
    ? `Gap: only ${weak.coveredBy} expert${weak.coveredBy === 1 ? '' : 's'} cover Q${weak.index} (${weak.label}). Add from Top 20 or start outreach.`
    : null;
  return { coverage, gap };
}

/**
 * Ranks the non-excluded matches into a shortlist of `size`.
 * Pinned experts are kept first; the rest sort by match %.
 * The first 8 are selected for pitching by default (wireframe 05).
 */
export function buildShortlist(
  project: Project,
  matches: MatchResult,
  size: ShortlistSize,
  now: Date,
): Shortlist {
  const pool = matches.experts.filter((e) => !e.excluded);
  const pinned = pool.filter((e) => e.pinned);
  const rest = pool
    .filter((e) => !e.pinned)
    .sort((a, b) => b.matchPercent - a.matchPercent || a.id.localeCompare(b.id));
  const ordered = [...pinned, ...rest].slice(0, size);
  const defaultSelected = Math.min(8, ordered.length);
  const experts: ShortlistedExpert[] = ordered.map((expert, index) => ({
    ...expert,
    rank: index + 1,
    selected: index < defaultSelected,
  }));
  const { coverage, gap } = coverageFor(project, experts);
  return {
    projectId: project.id,
    size,
    generatedAt: now.toISOString(),
    fromMatchCount: matches.experts.filter((e) => !e.excluded).length,
    weights: DEFAULT_RANKING_WEIGHTS,
    experts,
    coverage,
    gap,
  };
}

/** Drop one expert and pull the next-best unused match into the shortlist. */
export function swapOrRemove(
  shortlist: Shortlist,
  matches: MatchResult,
  project: Project,
  opts: { removeId?: string; swapId?: string },
  now: Date,
): Shortlist {
  const dropId = opts.removeId ?? opts.swapId;
  if (!dropId) return shortlist;
  const kept = shortlist.experts.filter((e) => e.id !== dropId);
  const used = new Set([...kept.map((e) => e.id), dropId]);
  const next = matches.experts
    .filter((e) => !e.excluded && !used.has(e.id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.matchPercent - a.matchPercent)[0];
  // Remove and swap both refill from the next-best match so the Top N stays full.
  const rebuilt = next ? [...kept, { ...next, rank: 0, selected: false }] : kept;
  const experts: ShortlistedExpert[] = rebuilt
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, shortlist.size)
    .map((expert, index) => ({
      ...expert,
      rank: index + 1,
      selected: expert.selected ?? index < 8,
    }));
  const { coverage, gap } = coverageFor(project, experts);
  return { ...shortlist, experts, coverage, gap, generatedAt: now.toISOString() };
}
