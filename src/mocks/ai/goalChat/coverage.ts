import type { CoverageItem, CoverageResult, ResearchBrief } from '@/features/goal-chat';
import type { LibraryItem } from '@/features/library';
import { regionAncestry, regionLabel } from '../../fixtures/entities';
import type { CoverageScenario } from '../../controls';

type Options = {
  library: LibraryItem[];
  ownedReportIds: string[];
  scenario: CoverageScenario;
};

type Scope = 'exact' | 'broader' | 'other' | 'unscoped';

/** How well a report's scope fits the brief's companies and regions. */
function scopeFit(item: LibraryItem, brief: ResearchBrief): { scope: Scope; note: string } {
  const companyIds = brief.subjects.filter((s) => s.kind === 'company').map((s) => s.id);
  const regionIds = brief.subjects.filter((s) => s.kind === 'region').map((s) => s.id);

  if (companyIds.length > 0 && item.companyIds.length > 0) {
    if (item.companyIds.some((id) => companyIds.includes(id))) return { scope: 'exact', note: '' };
  }
  if (regionIds.length === 0) return { scope: 'unscoped', note: '' };
  if (item.regionIds.some((id) => regionIds.includes(id))) return { scope: 'exact', note: '' };

  const wanted = regionIds[0] ?? '';
  const ancestors = regionAncestry(wanted).slice(1);
  const broader = item.regionIds.find((id) => ancestors.includes(id));
  if (broader) {
    return {
      scope: 'broader',
      note: `covers ${regionLabel(broader)} overall, not ${regionLabel(wanted)} specifically`,
    };
  }
  const elsewhere = item.regionIds[0];
  return {
    scope: 'other',
    note: `covers ${elsewhere ? regionLabel(elsewhere) : 'another market'}, not ${regionLabel(wanted)}`,
  };
}

/**
 * Coverage map: per question, is it answered by library reports? Matches a question's topic
 * to report sections, then grades by scope (PRODUCT_PLAN F2 step 6).
 */
export function computeCoverage(brief: ResearchBrief, options: Options): CoverageResult {
  const { library, ownedReportIds, scenario } = options;
  const usedReports = new Map<string, Set<string>>();

  const items: CoverageItem[] = brief.questions.map((question) => {
    if (scenario === 'none' || library.length === 0) {
      return {
        questionId: question.id,
        coverage: 'none',
        reason: 'No library report answers this yet. Custom research would cover it.',
        matches: [],
      };
    }

    const candidates = library.flatMap((item) =>
      item.toc
        .filter((section) => section.topics.includes(question.topic))
        .map((section) => ({ item, section, fit: scopeFit(item, brief) })),
    );

    const rank: Record<Scope, number> = { exact: 0, unscoped: 1, broader: 2, other: 3 };
    candidates.sort((a, b) => rank[a.fit.scope] - rank[b.fit.scope]);
    const best = candidates[0];

    if (scenario === 'all' && !best) {
      const fallback = library[0];
      const section = fallback?.toc[0];
      if (fallback && section) {
        usedReports.set(fallback.id, (usedReports.get(fallback.id) ?? new Set()).add(question.id));
        return {
          questionId: question.id,
          coverage: 'full',
          reason: `Answered in “${section.title}”.`,
          matches: [{ libraryItemId: fallback.id, reportTitle: fallback.title, sectionTitle: section.title }],
        };
      }
    }

    if (!best) {
      return {
        questionId: question.id,
        coverage: 'none',
        reason: 'No library report answers this yet. Custom research would cover it.',
        matches: [],
      };
    }

    const isFull = scenario === 'all' || best.fit.scope === 'exact' || best.fit.scope === 'unscoped';
    usedReports.set(best.item.id, (usedReports.get(best.item.id) ?? new Set()).add(question.id));
    return {
      questionId: question.id,
      coverage: isFull ? 'full' : 'partial',
      reason: isFull
        ? `Answered in “${best.section.title}”.`
        : `Partly: “${best.section.title}” ${best.fit.note}.`,
      matches: [
        { libraryItemId: best.item.id, reportTitle: best.item.title, sectionTitle: best.section.title },
      ],
    };
  });

  const reports = [...usedReports.entries()].map(([id, questionIds]) => {
    const item = library.find((entry) => entry.id === id);
    if (!item) throw new Error(`Unknown library item ${id}`);
    return {
      id,
      title: item.title,
      summary: item.summary,
      priceCredits: item.priceCredits,
      expertCount: item.expertCount,
      owned: ownedReportIds.includes(id),
      questionIds: [...questionIds],
    };
  });

  return { items, reports };
}
