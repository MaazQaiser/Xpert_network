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
  TextArea,
} from '@carbon/react';
import { ArrowLeft, ArrowRight, Close, Edit, View } from '@carbon/icons-react';
import {
  EXPERT_SOURCE_LABELS,
  expertSourceSchema,
  extendResearchSchema,
  type ExtendResearch,
} from '../../model/expertSearch.schema';
import type { Project } from '../../model/project.schema';
import styles from './ExtendResearchSteps.module.scss';

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
  const heading = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ExtendResearch>({
    resolver: zodResolver(extendResearchSchema),
    mode: 'onBlur',
    defaultValues: {
      minExperts: 5,
      maxExperts: 10,
      minYears: 10,
      knowledge: project.requirements.map((r) => r.text).join(', '),
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
  const sources = (values.sources ?? []).map((s) => EXPERT_SOURCE_LABELS[s]).join(' and ');

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
          <TextArea
            id={`${idPrefix}-knowledge`}
            labelText="Knowledge the experts need"
            helperText="Pre-filled from the expert profile. Edit it to steer the search."
            rows={4}
            maxCount={300}
            enableCounter
            invalid={Boolean(errors.knowledge)}
            invalidText={errors.knowledge?.message}
            {...register('knowledge')}
          />
          <Controller
            control={control}
            name="sources"
            render={({ field }) => (
              <CheckboxGroup
                legendText="Where to look"
                invalid={Boolean(errors.sources)}
                invalidText={errors.sources?.message}
                orientation="horizontal"
              >
                {expertSourceSchema.options.map((source) => (
                  <Checkbox
                    key={source}
                    id={`${idPrefix}-source-${source}`}
                    labelText={EXPERT_SOURCE_LABELS[source]}
                    checked={field.value.includes(source)}
                    onChange={(_, { checked }) =>
                      field.onChange(
                        checked
                          ? [...field.value, source]
                          : field.value.filter((value) => value !== source),
                      )
                    }
                  />
                ))}
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
                <dd>{values.knowledge}</dd>
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
                <dd>{sources}</dd>
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
            <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 ? (
            <Button key="next" renderIcon={ArrowRight} onClick={() => void next()}>
              Next
            </Button>
          ) : step === 1 ? (
            <Button key="preview" renderIcon={View} onClick={() => void next()}>
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
