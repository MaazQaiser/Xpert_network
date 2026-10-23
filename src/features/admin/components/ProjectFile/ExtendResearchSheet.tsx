'use client';

import { useEffect, useRef } from 'react';
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
import { Close, MagicWand } from '@carbon/icons-react';
import {
  EXPERT_SOURCE_LABELS,
  expertSourceSchema,
  extendResearchSchema,
  type ExtendResearch,
} from '../../model/expertSearch.schema';
import type { Project } from '../../model/project.schema';
import styles from './ExpertsTab.module.scss';

type ExtendResearchSheetProps = {
  project: Project;
  onClose: () => void;
  onSubmit: (criteria: ExtendResearch) => void;
};

/**
 * A bottom sheet over the Experts tab: how many more experts (min and max), how experienced,
 * what they must know, and where to look. Escape or Cancel closes it; focus starts in the form.
 */
export function ExtendResearchSheet({ project, onClose, onSubmit }: ExtendResearchSheetProps) {
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
    first.current?.querySelector('input')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.sheet} role="dialog" aria-modal="false" aria-labelledby="extend-title">
      <Layer>
        <form className={styles.sheetForm} onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.sheetHeader}>
            <div>
              <h3 id="extend-title" className={styles.sheetTitle}>
                Extend research
              </h3>
              <p className={styles.sheetText}>
                Tell the AI who else to look for. It adds the new experts to the table.
              </p>
            </div>
            <IconButton kind="ghost" size="md" label="Close" align="left" onClick={onClose}>
              <Close />
            </IconButton>
          </div>

          <div className={styles.sheetGrid} ref={first}>
            <Controller
              control={control}
              name="minExperts"
              render={({ field }) => (
                <NumberInput
                  id="extend-min"
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
                  id="extend-max"
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
                  id="extend-years"
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
            id="extend-knowledge"
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
                    id={`extend-source-${source}`}
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
            <Button kind="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" renderIcon={MagicWand}>
              Find more experts
            </Button>
          </div>
        </form>
      </Layer>
    </div>
  );
}
