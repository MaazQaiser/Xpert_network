'use client';

import type { ReactNode } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  Form,
  InlineNotification,
  NumberInput,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  SkeletonText,
  Stack,
  TextArea,
  TextInput,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { createId } from '@/shared/lib/id';
import { ErrorState } from '@/shared/ui';
import { useTaxonomy } from '../../api/queries';
import {
  basicsSchema,
  complianceSchema,
  expertiseSchema,
  workHistorySchema,
  YEAR_OPTIONS,
  type Basics,
  type Compliance,
  type EmployerPermission,
  type ExpertOnboarding,
  type Expertise,
  type Position,
  type WorkHistory,
} from '../../model/expert.schema';
import type { Taxonomy } from '../../model/taxonomy.schema';
import { OptionMultiSelect } from '../OptionMultiSelect/OptionMultiSelect';
import { StepActions } from '../StepActions/StepActions';
import styles from './ExpertOnboardingFlow.module.scss';

type StepProps<T> = {
  profile: ExpertOnboarding;
  isBusy: boolean;
  onBack?: () => void;
  onSubmit: (values: T) => void;
};

function StepHeading({ id, title, help }: { id: string; title: string; help: string }) {
  return (
    <div>
      <h2 id={id} className={styles.stepTitle}>
        {title}
      </h2>
      <p className={styles.help}>{help}</p>
    </div>
  );
}

/** Renders the step once pick lists load; loading / error / empty in place. */
function WithTaxonomy({
  children,
  needs,
}: {
  children: (taxonomy: Taxonomy) => ReactNode;
  needs: (keyof Taxonomy)[];
}) {
  const taxonomy = useTaxonomy();
  if (taxonomy.isPending) return <SkeletonText paragraph lineCount={4} />;
  if (taxonomy.isError) {
    return (
      <ErrorState
        title="Couldn’t load the lists for this step"
        message={toUserMessage(taxonomy.error)}
        onRetry={() => void taxonomy.refetch()}
      />
    );
  }
  if (needs.some((key) => taxonomy.data[key].length === 0)) {
    return (
      <InlineNotification
        kind="info"
        title="Nothing to choose from yet"
        subtitle="These lists are empty right now. Try again later, or contact support to finish your profile."
        lowContrast
        hideCloseButton
      />
    );
  }
  return <>{children(taxonomy.data)}</>;
}

// ——— 1. Basics ————————————————————————————————————————————————————

export function BasicsStep({ profile, isBusy, onSubmit }: StepProps<Basics>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Basics>({
    resolver: zodResolver(basicsSchema),
    mode: 'onBlur',
    defaultValues: profile.basics ?? { headline: '', countryId: '', linkedinUrl: '' },
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="basics-heading">
      <Stack gap={6}>
        <StepHeading
          id="basics-heading"
          title="Basics"
          help="Clients never see your name. They see your headline, years of experience and region."
        />
        <TextInput
          id="basics-headline"
          labelText="Headline"
          helperText="Your role and field, like “Former supply-chain manager, F&B”."
          invalid={Boolean(errors.headline)}
          invalidText={errors.headline?.message}
          {...register('headline')}
        />
        <Controller
          control={control}
          name="yearsExperience"
          render={({ field }) => (
            <NumberInput
              id="basics-years"
              label="Years of relevant experience"
              min={1}
              max={60}
              allowEmpty
              className={styles.narrow}
              value={field.value ?? ''}
              onChange={(_, { value }) => field.onChange(value === '' ? undefined : Number(value))}
              onBlur={field.onBlur}
              invalid={Boolean(errors.yearsExperience)}
              invalidText={errors.yearsExperience?.message}
            />
          )}
        />
        <WithTaxonomy needs={['countries']}>
          {(taxonomy) => (
            <Select
              id="basics-country"
              labelText="Country you’re based in"
              className={styles.field}
              invalid={Boolean(errors.countryId)}
              invalidText={errors.countryId?.message}
              {...register('countryId')}
            >
              <SelectItem value="" text="Choose a country" />
              {taxonomy.countries.map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.label} />
              ))}
            </Select>
          )}
        </WithTaxonomy>
        <TextInput
          id="basics-linkedin"
          labelText="LinkedIn profile (optional)"
          type="url"
          helperText="Speeds up review. Only our team sees it."
          placeholder="https://www.linkedin.com/in/your-name"
          invalid={Boolean(errors.linkedinUrl)}
          invalidText={errors.linkedinUrl?.message}
          {...register('linkedinUrl')}
        />
        <StepActions primaryLabel="Save and continue" isBusy={isBusy} />
      </Stack>
    </Form>
  );
}

// ——— 2. Work history ——————————————————————————————————————————————

const emptyPosition = (): Position => ({
  id: createId('pos'),
  company: '',
  title: '',
  startYear: '',
  endYear: '',
});

export function WorkStep({ profile, isBusy, onBack, onSubmit }: StepProps<WorkHistory>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkHistory>({
    resolver: zodResolver(workHistorySchema),
    defaultValues: profile.work ?? { positions: [emptyPosition()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'positions', keyName: 'key' });
  const listError = errors.positions?.message ?? errors.positions?.root?.message;

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="work-heading">
      <Stack gap={6}>
        <StepHeading
          id="work-heading"
          title="Work history"
          help="Your most relevant roles, newest first. We use them to match you to open calls and to check for conflicts."
        />
        {fields.map((field, index) => {
          const fieldErrors = errors.positions?.[index];
          const label = `Role ${index + 1}`;
          return (
            <fieldset key={field.key} className={styles.position}>
              <legend className={styles.positionTitle}>{label}</legend>
              <TextInput
                id={`work-${index}-company`}
                labelText="Company"
                invalid={Boolean(fieldErrors?.company)}
                invalidText={fieldErrors?.company?.message}
                {...register(`positions.${index}.company`)}
              />
              <TextInput
                id={`work-${index}-title`}
                labelText="Role"
                invalid={Boolean(fieldErrors?.title)}
                invalidText={fieldErrors?.title?.message}
                {...register(`positions.${index}.title`)}
              />
              <div className={styles.years}>
                <Select
                  id={`work-${index}-start`}
                  labelText="From"
                  invalid={Boolean(fieldErrors?.startYear)}
                  invalidText={fieldErrors?.startYear?.message}
                  {...register(`positions.${index}.startYear`)}
                >
                  <SelectItem value="" text="Year" />
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year} text={year} />
                  ))}
                </Select>
                <Select
                  id={`work-${index}-end`}
                  labelText="To"
                  invalid={Boolean(fieldErrors?.endYear)}
                  invalidText={fieldErrors?.endYear?.message}
                  {...register(`positions.${index}.endYear`)}
                >
                  <SelectItem value="" text="Present" />
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year} text={year} />
                  ))}
                </Select>
              </div>
              {fields.length > 1 ? (
                <div>
                  <Button kind="ghost" size="sm" onClick={() => remove(index)}>
                    Remove {label.toLowerCase()}
                  </Button>
                </div>
              ) : null}
            </fieldset>
          );
        })}
        {listError ? (
          <p className={styles.error} role="alert">
            {listError}
          </p>
        ) : null}
        <div>
          <Button
            kind="tertiary"
            size="md"
            disabled={fields.length >= 6}
            onClick={() => append(emptyPosition())}
          >
            Add another role
          </Button>
        </div>
        <StepActions onBack={onBack} primaryLabel="Save and continue" isBusy={isBusy} />
      </Stack>
    </Form>
  );
}

// ——— 3. Expertise & regions ———————————————————————————————————————

export function ExpertiseStep({ profile, isBusy, onBack, onSubmit }: StepProps<Expertise>) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Expertise>({
    resolver: zodResolver(expertiseSchema),
    defaultValues: profile.expertise ?? {
      industryIds: [],
      topicIds: [],
      regionIds: [],
      languageIds: [],
    },
  });

  const fields: {
    name: keyof Expertise;
    title: string;
    helper: string;
    placeholder: string;
    source: keyof Taxonomy;
  }[] = [
    {
      name: 'industryIds',
      title: 'Industries',
      helper: 'Where you’ve worked or advised.',
      placeholder: 'Search industries',
      source: 'industries',
    },
    {
      name: 'topicIds',
      title: 'Topics you know best',
      helper: 'Up to 8. Open calls are matched on these.',
      placeholder: 'Search topics',
      source: 'topics',
    },
    {
      name: 'regionIds',
      title: 'Regions',
      helper: 'Markets you know first-hand.',
      placeholder: 'Search regions',
      source: 'regions',
    },
    {
      name: 'languageIds',
      title: 'Interview languages',
      helper: 'Languages you can give an interview in.',
      placeholder: 'Search languages',
      source: 'languages',
    },
  ];

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="expertise-heading">
      <Stack gap={6}>
        <StepHeading
          id="expertise-heading"
          title="Expertise & regions"
          help="Be specific: a narrow, deep profile gets more strong matches than a broad one."
        />
        <WithTaxonomy needs={['industries', 'topics', 'regions', 'languages']}>
          {(taxonomy) => (
            <Stack gap={6}>
              {fields.map((f) => (
                <Controller
                  key={f.name}
                  control={control}
                  name={f.name}
                  render={({ field }) => (
                    <OptionMultiSelect
                      id={`expertise-${f.name}`}
                      titleText={f.title}
                      helperText={f.helper}
                      placeholder={f.placeholder}
                      options={taxonomy[f.source]}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalidText={errors[f.name]?.message}
                    />
                  )}
                />
              ))}
            </Stack>
          )}
        </WithTaxonomy>
        <StepActions onBack={onBack} primaryLabel="Save and continue" isBusy={isBusy} />
      </Stack>
    </Form>
  );
}

// ——— 4. Compliance & conflicts ——————————————————————————————————————

const EMPLOYMENT: Record<EmployerPermission, string> = {
  not_employed: 'I’m not employed in this field right now',
  permitted: 'I’m employed, and my employer allows paid expert interviews',
  not_sure: 'I’m employed, and I’m not sure what my contract allows',
};

const ATTESTATIONS: {
  name: 'attestConfidentiality' | 'attestInsider' | 'attestAccuracy';
  label: string;
}[] = [
  {
    name: 'attestConfidentiality',
    label:
      'I won’t share confidential information or trade secrets of any current or former employer or client.',
  },
  {
    name: 'attestInsider',
    label:
      'I won’t share material non-public information about any listed company, and I’ll decline questions that would require it.',
  },
  {
    name: 'attestAccuracy',
    label: 'My profile is accurate, and I’ll keep my conflicts up to date.',
  },
];

export function ComplianceStep({ profile, isBusy, onBack, onSubmit }: StepProps<Compliance>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Compliance>({
    resolver: zodResolver(complianceSchema),
    defaultValues: profile.compliance ?? {
      employerPermission: 'not_employed',
      conflicts: '',
      isPublicOfficial: false,
      attestConfidentiality: false,
      attestInsider: false,
      attestAccuracy: false,
    },
  });
  const permission = useWatch({ control, name: 'employerPermission' });
  const isOfficial = useWatch({ control, name: 'isPublicOfficial' });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="compliance-heading">
      <Stack gap={6}>
        <StepHeading
          id="compliance-heading"
          title="Compliance & conflicts"
          help="We screen every interview against these answers. They’re never shown to clients."
        />
        <Controller
          control={control}
          name="employerPermission"
          render={({ field }) => (
            <RadioButtonGroup
              legendText="Current employment"
              name="employerPermission"
              orientation="vertical"
              valueSelected={field.value}
              onChange={(value) => field.onChange(value as EmployerPermission)}
            >
              {(Object.keys(EMPLOYMENT) as EmployerPermission[]).map((key) => (
                <RadioButton
                  key={key}
                  id={`employment-${key}`}
                  value={key}
                  labelText={EMPLOYMENT[key]}
                />
              ))}
            </RadioButtonGroup>
          )}
        />
        {permission === 'not_sure' ? (
          <InlineNotification
            kind="warning"
            title="Check your contract first"
            subtitle="You can still apply. We won’t offer you calls about your employer, and you should confirm you’re allowed before your first interview."
            lowContrast
            hideCloseButton
          />
        ) : null}
        <TextArea
          id="compliance-conflicts"
          labelText="Companies you can’t discuss (optional)"
          helperText="Current or recent employers (last 12 months), clients you advise, and companies you hold shares in. One per line."
          rows={3}
          maxCount={500}
          enableCounter
          invalid={Boolean(errors.conflicts)}
          invalidText={errors.conflicts?.message}
          {...register('conflicts')}
        />
        <Controller
          control={control}
          name="isPublicOfficial"
          render={({ field }) => (
            <Checkbox
              id="compliance-official"
              labelText="I am, or was in the last 2 years, a government official or an employee of a state-owned company"
              checked={field.value}
              onChange={(_, { checked }) => field.onChange(checked)}
            />
          )}
        />
        {isOfficial ? (
          <InlineNotification
            kind="info"
            title="We’ll ask a few more questions"
            subtitle="Our team will contact you during review about any restrictions that apply."
            lowContrast
            hideCloseButton
          />
        ) : null}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Declarations</legend>
          {ATTESTATIONS.map((a) => (
            <Controller
              key={a.name}
              control={control}
              name={a.name}
              render={({ field }) => (
                <Checkbox
                  id={`compliance-${a.name}`}
                  labelText={a.label}
                  checked={field.value}
                  onChange={(_, { checked }) => field.onChange(checked)}
                  invalid={Boolean(errors[a.name])}
                  invalidText={errors[a.name]?.message}
                />
              )}
            />
          ))}
        </fieldset>
        <StepActions onBack={onBack} primaryLabel="Save and continue" isBusy={isBusy} />
      </Stack>
    </Form>
  );
}
