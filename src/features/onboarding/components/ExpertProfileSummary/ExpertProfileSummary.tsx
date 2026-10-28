'use client';

import type { ReactNode } from 'react';
import { Button, SkeletonText, Tag } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { ErrorState } from '@/shared/ui';
import { useTaxonomy } from '../../api/queries';
import {
  EXPERT_STEP_LABELS,
  SECTION_STEPS,
  type ExpertOnboarding,
  type SectionStep,
} from '../../model/expert.schema';
import { labelsFor, type Taxonomy } from '../../model/taxonomy.schema';
import styles from '../ExpertOnboardingFlow/ExpertOnboardingFlow.module.scss';

const EMPLOYMENT_SHORT = {
  not_employed: 'Not employed in this field',
  permitted: 'Employed; employer allows interviews',
  not_sure: 'Employed; checking contract',
} as const;

type ExpertProfileSummaryProps = {
  profile: ExpertOnboarding;
  /** Shows an Edit button per section (review step). */
  onEdit?: (step: SectionStep) => void;
  headingLevel?: 2 | 3;
  /** Which sections to show; defaults to all four. */
  sections?: SectionStep[];
};

/** Read-only expert profile, by section (F7 review, expert home, F17 profile). */
export function ExpertProfileSummary({
  profile,
  onEdit,
  headingLevel = 3,
  sections = SECTION_STEPS,
}: ExpertProfileSummaryProps) {
  const taxonomy = useTaxonomy();
  if (taxonomy.isPending) return <SkeletonText paragraph lineCount={6} />;
  if (taxonomy.isError) {
    return (
      <ErrorState message={toUserMessage(taxonomy.error)} onRetry={() => void taxonomy.refetch()} />
    );
  }
  const Heading = `h${headingLevel}` as const;

  return (
    <div>
      {sections.map((step) => (
        <section key={step} className={styles.section} aria-labelledby={`summary-${step}`}>
          <div className={styles.sectionHeader}>
            <Heading id={`summary-${step}`} className={styles.sectionTitle}>
              {EXPERT_STEP_LABELS[step]}
            </Heading>
            {onEdit ? (
              <Button kind="ghost" size="sm" onClick={() => onEdit(step)}>
                Edit {EXPERT_STEP_LABELS[step].toLowerCase()}
              </Button>
            ) : null}
          </div>
          {profile[step] === null ? (
            <p className={styles.missing}>Not completed yet.</p>
          ) : (
            <SectionFacts profile={profile} step={step} taxonomy={taxonomy.data} />
          )}
        </section>
      ))}
    </div>
  );
}

function Tags({ ids, options }: { ids: string[]; options: Taxonomy[keyof Taxonomy] }) {
  return (
    <span className={styles.tags}>
      {labelsFor(ids, options).map((label) => (
        <Tag key={label} type="gray" size="sm">
          {label}
        </Tag>
      ))}
    </span>
  );
}

function SectionFacts({
  profile,
  step,
  taxonomy,
}: {
  profile: ExpertOnboarding;
  step: SectionStep;
  taxonomy: Taxonomy;
}) {
  const rows: [string, ReactNode][] = [];
  if (step === 'basics' && profile.basics) {
    const b = profile.basics;
    rows.push(
      ['Headline', b.headline],
      ['Experience', `${b.yearsExperience} years`],
      ['Based in', labelsFor([b.countryId], taxonomy.countries)[0]],
      ['LinkedIn', b.linkedinUrl || 'Not added'],
    );
  }
  if (step === 'work' && profile.work) {
    profile.work.positions.forEach((p, i) =>
      rows.push([
        `Role ${i + 1}`,
        `${p.title}, ${p.company} · ${p.startYear}–${p.endYear || 'present'}`,
      ]),
    );
  }
  if (step === 'expertise' && profile.expertise) {
    const e = profile.expertise;
    rows.push(
      ['Industries', <Tags key="i" ids={e.industryIds} options={taxonomy.industries} />],
      ['Topics', <Tags key="t" ids={e.topicIds} options={taxonomy.topics} />],
      ['Regions', <Tags key="r" ids={e.regionIds} options={taxonomy.regions} />],
      ['Languages', <Tags key="l" ids={e.languageIds} options={taxonomy.languages} />],
    );
  }
  if (step === 'compliance' && profile.compliance) {
    const c = profile.compliance;
    rows.push(
      ['Employment', EMPLOYMENT_SHORT[c.employerPermission]],
      ['Can’t discuss', c.conflicts || 'None declared'],
      ['Public official', c.isPublicOfficial ? 'Yes, in the last 2 years' : 'No'],
      ['Declarations', 'All confirmed'],
    );
  }
  return (
    <dl className={styles.facts}>
      {rows.map(([term, value]) => (
        <div key={term} className={styles.factRow}>
          <dt className={styles.term}>{term}</dt>
          <dd className={styles.definition}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
