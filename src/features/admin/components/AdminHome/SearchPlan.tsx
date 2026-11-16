'use client';

import { useId } from 'react';
import { InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import type {
  BriefRequirements,
  SearchPlan as Plan,
  SearchRoute,
} from '../../model/requirements.schema';
import styles from './RequirementsPanel.module.scss';

/** Profile search's filter fields, in words. The UI never names the providers. */
const FIELD_LABELS: Record<string, string> = {
  current_position_titles: 'Title',
  past_position_titles: 'Past title',
  current_position_seniority_level: 'Seniority',
  current_position_job_functions: 'Function',
  current_position_sub_functions: 'Sub-function',
  person_locations: 'Location',
  person_skills: 'Skills',
  person_languages: 'Languages',
  person_universities: 'University',
  current_company_names: 'Current company',
  current_company_domains: 'Current company website',
  past_company_names: 'Past company',
  past_company_domains: 'Past company website',
  current_company_industries: 'Industry',
  current_company_types: 'Company type',
  current_company_specialties: 'Company specialties',
  current_company_technologies: 'Company technologies',
  current_company_headquarters: 'Company headquarters',
  current_company_headcounts: 'Company size',
  current_company_founded_years: 'Company founded',
  current_position_years_in: 'Years in role',
  current_company_years_at: 'Years at company',
  current_company_days_since_last_job_change: 'Days since changing job',
};

const fieldLabel = (field: string) => {
  const known = FIELD_LABELS[field];
  if (known) return known;
  const words = field.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const PURPOSES: Record<Plan['queries'][number]['purpose'], string> = {
  companies: 'Finds companies',
  people: 'Finds people',
  check: 'Checks people',
};

type Filter = Plan['filters'][number];

/** "Seniority: Director, Manager", "Current company: not REI", "Company size: 50–500". */
export function filterText(filter: Filter): string {
  const not = filter.exclude ? 'not ' : '';
  let value: string;
  if (filter.values.length > 0) value = filter.values.join(', ');
  else if (filter.min !== null && filter.max !== null) value = `${filter.min}–${filter.max}`;
  else if (filter.min !== null) value = `${filter.min} or more`;
  else value = `up to ${filter.max ?? ''}`;
  return `${fieldLabel(filter.field)}: ${not}${value}`;
}

/** The small tag on a requirement that says how it's searched; nothing for `none`. */
export function RouteTag({ plan, requirementId }: { plan: Plan | null; requirementId: string }) {
  const route = plan?.routes.find((r) => r.requirementId === requirementId);
  if (!route || route.route === 'none') return null;
  const labels: Record<Exclude<SearchRoute, 'none'>, string> = {
    filter: 'Profile search',
    exa: 'Web',
    screening:
      route.questions.length > 0
        ? `Screening ${route.questions.map((n) => `Q${n}`).join(', ')}`
        : 'Screening',
  };
  const types = { filter: 'cyan', exa: 'purple', screening: 'teal' } as const;
  return (
    <Tag size="sm" type={types[route.route]} className={styles.checkTag}>
      {labels[route.route]}
    </Tag>
  );
}

/** "Hiker 2 · Runner 2": the profile groups with a quota, for beside the number needed. */
export function quotaText(plan: Plan | null): string | null {
  const groups = plan?.groups.filter((g) => g.quota !== null) ?? [];
  return groups.length > 0 ? groups.map((g) => `${g.name} ${g.quota}`).join(' · ') : null;
}

/**
 * The search plan the AI made from the requirements, read-only: the profile search filters and
 * the web searches, each with the requirements it covers.
 */
export function SearchPlan({ requirements }: { requirements: BriefRequirements }) {
  const headingId = useId();
  const { plan, planStatus, planCurrent } = requirements;
  const textById = new Map(
    requirements.sections.flatMap((s) => s.items).map((item) => [item.id, item.text]),
  );
  const covers = (ids: string[]) => {
    const texts = ids.flatMap((id) => textById.get(id) ?? []);
    return texts.length > 0 ? (
      <span className={styles.planCovers}>For: {texts.join('; ')}</span>
    ) : null;
  };

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.planHeading}>
        <h3 id={headingId} className={styles.sectionTitle}>
          Search plan
        </h3>
        <AIExplainLabel aria-label="AI planned" />
      </div>
      {planStatus === 'updating' ? (
        <InlineLoading status="active" description="Updating the search plan…" />
      ) : planStatus === 'failed' ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Couldn’t make the search plan."
          subtitle="It’s made again the next time the requirements are saved."
        />
      ) : plan && !planCurrent ? (
        <p className={styles.empty}>Made from an earlier version of these requirements.</p>
      ) : null}

      {plan ? (
        <>
          <h4 className={styles.planSubtitle}>Profile search filters</h4>
          {plan.filters.length > 0 ? (
            <ul className={styles.planList}>
              {plan.filters.map((filter, index) => (
                <li key={`${filter.field}-${index}`} className={styles.planItem}>
                  <span>{filterText(filter)}</span>
                  {covers(filter.covers)}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No profile filters.</p>
          )}
          <h4 className={styles.planSubtitle}>Web searches</h4>
          {plan.queries.length > 0 ? (
            <ul className={styles.planList}>
              {plan.queries.map((query, index) => (
                <li key={`${query.purpose}-${index}`} className={styles.planItem}>
                  <span>
                    <Tag size="sm" type="gray" className={styles.purposeTag}>
                      {PURPOSES[query.purpose]}
                    </Tag>
                  </span>
                  <span>{query.query}</span>
                  {covers(query.covers)}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No web searches.</p>
          )}
        </>
      ) : planStatus === 'updating' ? null : (
        <p className={styles.empty}>No search plan yet.</p>
      )}
    </section>
  );
}
