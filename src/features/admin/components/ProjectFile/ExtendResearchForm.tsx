'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, CheckboxGroup, NumberInput, TextArea } from '@carbon/react';
import {
  EXPERT_SOURCE_LABELS,
  expertSourceSchema,
  extendResearchSchema,
  type ExtendResearch,
} from '../../model/expertSearch.schema';
import type { Project } from '../../model/project.schema';
import styles from './ExpertsTab.module.scss';

type ExtendResearchFormProps = {
  project: Project;
  /** Prefix for field ids, so the sheet and a chat card can both be on the page. */
  idPrefix: string;
  /** The title and intro above the fields. */
  header: ReactNode;
  className?: string;
  onCancel: () => void;
  onSubmit: (criteria: ExtendResearch) => void;
};

/**
 * Who else the AI should look for: how many more experts (min and max), how experienced, what
 * they must know, and where to look. Used by the Experts tab sheet and the Home chat. Focus
 * starts on the first field.
 */
export function ExtendResearchForm({
  project,
  idPrefix,
  header,
  className,
  onCancel,
  onSubmit,
}: ExtendResearchFormProps) {
  const first = useRef<HTMLDivElement>(null);
  const {
    control,
    register,
    handleSubmit,
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

  useEffect(() => {
    // The surrounding page decides how to scroll the form into view, so focus without jumping.
    first.current?.querySelector('input')?.focus({ preventScroll: true });
  }, []);

  return (
    <form className={className} onSubmit={handleSubmit(onSubmit)} noValidate>
      {header}
      <div className={styles.sheetGrid} ref={first}>
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

      <TextArea
        id={`${idPrefix}-knowledge`}
        labelText="Knowledge the experts need"
        helperText="Pre-filled from the expert profile. Edit it to steer the search."
        rows={2}
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
            legendText="Sources"
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

      <div className={styles.sheetActions}>
        <Button kind="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Find more experts</Button>
      </div>
    </form>
  );
}
