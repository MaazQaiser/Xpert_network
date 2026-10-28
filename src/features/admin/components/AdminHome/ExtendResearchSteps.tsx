'use client';

import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  IconButton,
  Layer,
  NumberInput,
  Tag,
} from '@carbon/react';
import { Api, Close, Edit, LogoLinkedin } from '@carbon/icons-react';
import {
  EXPERT_SOURCE_LABELS,
  expertSourceSchema,
  extendResearchSchema,
  type ExtendResearch,
} from '../../model/expertSearch.schema';
import type { Project } from '../../model/project.schema';
import styles from './ExtendResearchSteps.module.scss';

const SOURCE_ICONS = {
  linkedin: LogoLinkedin,
  api: Api,
} as const;

const STEPS = ['Search size', 'Knowledge', 'Preview'] as const;

// What each step asks, in the assistant's voice.
const QUESTIONS = [
  'How many more experts should I find, and how experienced should they be?',
  'What should they know, and where should I look?',
  'Here’s what I’ll search for. Look right?',
] as const;

// The fields each step checks before moving on.
const STEP_FIELDS: (keyof ExtendResearch)[][] = [
  ['minExperts', 'maxExperts', 'minYears'],
  ['knowledge', 'sources'],
  [],
];

type FilterTag = { id: string; text: string };

function filtersFrom(project: Project): FilterTag[] {
  return project.requirements.map((item) => ({ id: item.id, text: item.text }));
}

function knowledgeText(tags: FilterTag[]): string {
  return tags.map((tag) => tag.text).join(', ');
}

type ExtendResearchStepsProps = {
  project: Project;
  idPrefix: string;
  onCancel: () => void;
  onSubmit: (criteria: ExtendResearch) => void;
};

/**
 * Extend research, asked one question at a time (like Claude's question cards): how many and
 * how senior, then what they should know and where to look, then a preview to check before the
 * search starts. Back moves a step back; Edit on the preview jumps to that step.
 */
export function ExtendResearchSteps({
  project,
  idPrefix,
  onCancel,
  onSubmit,
}: ExtendResearchStepsProps) {
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState(() => filtersFrom(project));
  const heading = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ExtendResearch>({
    resolver: zodResolver(extendResearchSchema),
    mode: 'onBlur',
    defaultValues: {
      minExperts: 5,
      maxExperts: 10,
      minYears: 10,
      knowledge: knowledgeText(filtersFrom(project)),
      sources: ['linkedin', 'api'],
    },
  });

  // Each new step announces itself (focus moves to its question) and the card scrolls so the
  // whole step, buttons included, sits above the ask bar. Not on first open: the chat does that.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    const card = heading.current?.closest('article');
    if (!card) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fits = card.getBoundingClientRect().height < window.innerHeight * 0.7;
    card.scrollIntoView?.({ block: fits ? 'end' : 'start', behavior: still ? 'auto' : 'smooth' });
  }, [step]);

  const next = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((current) => current + 1);
  };

  const values = getValues();

  const setFilters = (next: FilterTag[]) => {
    setTags(next);
    setValue('knowledge', knowledgeText(next), { shouldValidate: true });
  };

  return (
    // Layer: the card is a layer, so its fields take the next field colour and stand out from it.
    <Layer>
      <form className={styles.root} onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Like a Claude question card: the question, then where you are as a page number, and
          a way out, all on one line. */}
        <header className={styles.head}>
          <h4 ref={heading} tabIndex={-1} className={styles.question}>
            {QUESTIONS[step]}
          </h4>
          <div className={styles.headSide}>
            <span
              className={styles.page}
              aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
            >
              {step + 1} of {STEPS.length}
            </span>
            <IconButton kind="ghost" size="sm" label="Close" align="left" onClick={onCancel}>
              <Close />
            </IconButton>
          </div>
        </header>

        {/* Steps stay mounted (hidden) so the form keeps every answer when you go back; each fades
          in again as it reappears. */}
        <div className={styles.step} hidden={step !== 0}>
          <div className={styles.grid}>
            <Controller
              control={control}
              name="minExperts"
              render={({ field }) => (
                <NumberInput
                  id={`${idPrefix}-min`}
                  label="Experts required (min)"
                  min={1}
                  max={50}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(Number(value))}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.minExperts)}
                  invalidText={errors.minExperts?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="maxExperts"
              render={({ field }) => (
                <NumberInput
                  id={`${idPrefix}-max`}
                  label="Experts required (max)"
                  min={1}
                  max={50}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(Number(value))}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.maxExperts)}
                  invalidText={errors.maxExperts?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="minYears"
              render={({ field }) => (
                <NumberInput
                  id={`${idPrefix}-years`}
                  label="Experience (minimum years)"
                  min={0}
                  max={40}
                  value={field.value}
                  onChange={(_, { value }) => field.onChange(Number(value))}
                  onBlur={field.onBlur}
                  invalid={Boolean(errors.minYears)}
                  invalidText={errors.minYears?.message}
                />
              )}
            />
          </div>
        </div>

        <div className={styles.step} hidden={step !== 1}>
          <FilterTags
            id={`${idPrefix}-filter`}
            tags={tags}
            invalid={Boolean(errors.knowledge)}
            invalidText={errors.knowledge?.message}
            onChange={setFilters}
          />
          <Controller
            control={control}
            name="sources"
            render={({ field }) => (
              <CheckboxGroup
                legendText="Where to look"
                orientation="horizontal"
                invalid={Boolean(errors.sources)}
                invalidText={errors.sources?.message}
              >
                {expertSourceSchema.options.map((source) => {
                  const Icon = SOURCE_ICONS[source];
                  return (
                    <Checkbox
                      key={source}
                      id={`${idPrefix}-source-${source}`}
                      labelText={
                        <span className={styles.sourceLabel}>
                          <Icon size={16} aria-hidden={true} />
                          {EXPERT_SOURCE_LABELS[source]}
                        </span>
                      }
                      checked={field.value.includes(source)}
                      onChange={(_, { checked }) =>
                        field.onChange(
                          checked
                            ? [...field.value, source]
                            : field.value.filter((value) => value !== source),
                        )
                      }
                    />
                  );
                })}
              </CheckboxGroup>
            )}
          />
        </div>

        {step === 2 ? (
          <div className={styles.step}>
            <dl className={styles.preview}>
              <div>
                <dt>Experts</dt>
                <dd>
                  {values.minExperts}–{values.maxExperts} more, with {values.minYears}+ years
                </dd>
                <IconButton
                  kind="ghost"
                  size="sm"
                  label="Edit experts"
                  align="left"
                  onClick={() => setStep(0)}
                >
                  <Edit />
                </IconButton>
              </div>
              <div>
                <dt>Knowledge</dt>
                <dd className={styles.badges}>
                  {tags.map((item) => (
                    <span key={item.id} className={styles.chip}>
                      {item.text}
                    </span>
                  ))}
                </dd>
                <IconButton
                  kind="ghost"
                  size="sm"
                  label="Edit knowledge"
                  align="left"
                  onClick={() => setStep(1)}
                >
                  <Edit />
                </IconButton>
              </div>
              <div>
                <dt>Where to look</dt>
                <dd className={styles.badges}>
                  {values.sources.map((source) => (
                    <Tag key={source} size="sm" renderIcon={SOURCE_ICONS[source]}>
                      {EXPERT_SOURCE_LABELS[source]}
                    </Tag>
                  ))}
                </dd>
                <IconButton
                  kind="ghost"
                  size="sm"
                  label="Edit where to look"
                  align="left"
                  onClick={() => setStep(1)}
                >
                  <Edit />
                </IconButton>
              </div>
            </dl>
          </div>
        ) : null}

        {/* Each button keeps its own key: reusing one element as it turns into the submit button
          would let the Preview click also submit the form. */}
        <footer className={styles.foot}>
          {step === 0 ? (
            <Button kind="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button kind="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 ? (
            <Button key="next" onClick={() => void next()}>
              Next
            </Button>
          ) : step === 1 ? (
            <Button key="preview" onClick={() => void next()}>
              Preview
            </Button>
          ) : (
            <Button key="done" type="submit">
              Done, find experts
            </Button>
          )}
        </footer>
      </form>
    </Layer>
  );
}

/**
 * Filters live in a text field: each one is a tag you can remove, and typing plus Enter adds
 * another.
 */
function FilterTags({
  id,
  tags,
  invalid,
  invalidText,
  onChange,
}: {
  id: string;
  tags: FilterTag[];
  invalid: boolean;
  invalidText?: string;
  onChange: (tags: FilterTag[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const added = useRef(0);

  const add = (raw: string) => {
    const text = raw.trim().replace(/,+$/, '').trim();
    if (!text) return;
    if (tags.some((tag) => tag.text.toLowerCase() === text.toLowerCase())) {
      setDraft('');
      return;
    }
    added.current += 1;
    onChange([...tags, { id: `added-${added.current}`, text }]);
    setDraft('');
  };

  return (
    <div className={styles.field}>
      <label className={styles.legend} htmlFor={id}>
        Knowledge the experts need
      </label>
      <div className={invalid ? `${styles.tagBox} ${styles.tagBoxInvalid}` : styles.tagBox}>
        {tags.map((tag) => (
          <span key={tag.id} className={styles.chip}>
            <span className={styles.chipText}>{tag.text}</span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`Remove ${tag.text}`}
              onClick={() => onChange(tags.filter((item) => item.id !== tag.id))}
            >
              <Close size={16} aria-hidden={true} />
            </button>
          </span>
        ))}
        <input
          id={id}
          className={styles.tagInput}
          value={draft}
          placeholder="Add a filter"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
        />
      </div>
      <p className={invalid ? styles.invalid : styles.hint}>
        {invalidText ?? 'Type a filter and press Enter.'}
      </p>
    </div>
  );
}
