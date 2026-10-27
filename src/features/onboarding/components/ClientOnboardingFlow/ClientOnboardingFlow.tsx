'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  InlineNotification,
  Layer,
  ProgressIndicator,
  ProgressIndicatorSkeleton,
  ProgressStep,
  RadioButton,
  RadioButtonGroup,
  RadioTile,
  SkeletonText,
  Stack,
  TextInput,
  TileGroup,
} from '@carbon/react';
import { Globe } from '@carbon/pictograms-react';
import { GOAL_TYPE_LABELS, type GoalType } from '@/features/goal-chat';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState, ErrorState, PageHeader } from '@/shared/ui';
import { useClientOnboarding, useTaxonomy, useUpdateClientOnboarding } from '../../api/queries';
import {
  aboutFormSchema,
  CLIENT_SEGMENTS,
  type AboutFormInput,
  CLIENT_STEP_IDS,
  CLIENT_STEP_LABELS,
  interestsFormSchema,
  type AboutFormValues,
  type ClientOnboarding as ClientOnboardingData,
  type ClientOnboardingPatch,
  type ClientSegment,
  type ClientStep,
  type InterestsFormValues,
} from '../../model/client.schema';
import { OptionMultiSelect } from '../OptionMultiSelect/OptionMultiSelect';
import { StepActions } from '../StepActions/StepActions';
import styles from './ClientOnboardingFlow.module.scss';

const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  invest: 'Sales trajectory, competitors and risks before you invest.',
  expand: 'Suppliers, costs, lead times and regulation in a new region.',
  market: 'Size, players and trends in an industry or region.',
  other: 'Something else. Describe it in your own words.',
};

/** F1 client onboarding: About you → What you research → First goal. Skippable. */
export function ClientOnboardingFlow() {
  const onboarding = useClientOnboarding();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Set up your account"
        subtitle="Three quick questions so we can suggest the right research. You can skip and change this later in Settings."
      />
      <AsyncBoundary
        query={onboarding}
        errorTitle="Couldn’t load your setup"
        loading={
          <div aria-busy="true" aria-label="Loading your setup">
            <ProgressIndicatorSkeleton />
            <SkeletonText paragraph lineCount={4} className={styles.skeleton} />
          </div>
        }
      >
        {(data) => <ClientOnboardingView data={data} />}
      </AsyncBoundary>
    </div>
  );
}

function ClientOnboardingView({ data }: { data: ClientOnboardingData }) {
  const router = useRouter();
  const update = useUpdateClientOnboarding();
  const [step, setStep] = useState<ClientStep>(data.currentStep);
  const index = CLIENT_STEP_IDS.indexOf(step);

  const save = (patch: ClientOnboardingPatch, then?: () => void) =>
    update.mutate(patch, { onSuccess: () => then?.() });
  const goTo = (next: ClientStep) => save({ currentStep: next }, () => setStep(next));
  const skip = () => save({ status: 'skipped' }, () => router.push(routes.client.home));

  return (
    <Stack gap={7}>
      <div className={styles.toolbar}>
        <ProgressIndicator
          currentIndex={index}
          spaceEqually
          className={styles.stepper}
          onChange={(next: number) => {
            const target = CLIENT_STEP_IDS[next];
            if (target && next < index) goTo(target);
          }}
        >
          {CLIENT_STEP_IDS.map((id, i) => (
            <ProgressStep
              key={id}
              label={CLIENT_STEP_LABELS[id]}
              description={`Step ${i + 1} of ${CLIENT_STEP_IDS.length}: ${CLIENT_STEP_LABELS[id]}`}
              complete={i < index}
              disabled={i > index}
            />
          ))}
        </ProgressIndicator>
        <Button kind="ghost" onClick={skip} disabled={update.isPending}>
          Skip setup
        </Button>
      </div>

      {update.isError ? (
        <InlineNotification
          kind="error"
          title="Couldn’t save"
          subtitle={`${toUserMessage(update.error)} Your answers are still here.`}
          lowContrast
          onCloseButtonClick={() => update.reset()}
        />
      ) : null}

      <Layer className={styles.card}>
        {step === 'about' ? (
          <AboutStep
            data={data}
            isBusy={update.isPending}
            onSubmit={(about) =>
              save({ about, currentStep: 'interests' }, () => setStep('interests'))
            }
          />
        ) : step === 'interests' ? (
          <InterestsStep
            data={data}
            isBusy={update.isPending}
            onBack={() => goTo('about')}
            onSubmit={(interests) =>
              save({ interests, currentStep: 'goal' }, () => setStep('goal'))
            }
          />
        ) : (
          <GoalStep
            data={data}
            isBusy={update.isPending}
            onBack={() => goTo('interests')}
            onStart={(goal) =>
              save({ firstGoal: goal, status: 'complete' }, () =>
                router.push(`${routes.client.ask}?goal=${goal}`),
              )
            }
            onHome={() => save({ status: 'complete' }, () => router.push(routes.client.home))}
          />
        )}
      </Layer>
    </Stack>
  );
}

type StepProps = { data: ClientOnboardingData; isBusy: boolean; onBack?: () => void };

function AboutStep({
  data,
  isBusy,
  onSubmit,
}: StepProps & { onSubmit: (v: AboutFormValues) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AboutFormInput, unknown, AboutFormValues>({
    resolver: zodResolver(aboutFormSchema),
    defaultValues: data.about,
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="about-heading">
      <Stack gap={6}>
        <h2 id="about-heading" className={styles.stepTitle}>
          About you
        </h2>
        <Controller
          control={control}
          name="segment"
          render={({ field }) => (
            <RadioButtonGroup
              legendText="Which best describes you?"
              name="segment"
              orientation="vertical"
              valueSelected={field.value ?? ''}
              onChange={(value) => field.onChange(value as ClientSegment)}
              invalid={Boolean(errors.segment)}
              invalidText={errors.segment?.message}
            >
              {(Object.keys(CLIENT_SEGMENTS) as ClientSegment[]).map((key) => (
                <RadioButton
                  key={key}
                  id={`segment-${key}`}
                  value={key}
                  labelText={
                    <>
                      {CLIENT_SEGMENTS[key].label}
                      <span className={styles.optionDetail}> · {CLIENT_SEGMENTS[key].detail}</span>
                    </>
                  }
                />
              ))}
            </RadioButtonGroup>
          )}
        />
        <TextInput
          id="about-job-title"
          labelText="Job title"
          autoComplete="organization-title"
          invalid={Boolean(errors.jobTitle)}
          invalidText={errors.jobTitle?.message}
          className={styles.field}
          {...register('jobTitle')}
        />
        <TextInput
          id="about-organisation"
          labelText="Organisation (optional)"
          autoComplete="organization"
          className={styles.field}
          {...register('organisation')}
        />
        <StepActions primaryLabel="Continue" isBusy={isBusy} />
      </Stack>
    </Form>
  );
}

function InterestsStep({
  data,
  isBusy,
  onBack,
  onSubmit,
}: StepProps & { onSubmit: (v: InterestsFormValues) => void }) {
  const taxonomy = useTaxonomy();
  const isEmpty =
    taxonomy.data !== undefined &&
    taxonomy.data.industries.length === 0 &&
    taxonomy.data.regions.length === 0;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InterestsFormValues>({
    // With no lists to choose from, the step can't be required.
    resolver: isEmpty ? undefined : zodResolver(interestsFormSchema),
    defaultValues: data.interests,
  });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate aria-labelledby="interests-heading">
      <Stack gap={6}>
        <div>
          <h2 id="interests-heading" className={styles.stepTitle}>
            What you research
          </h2>
          <p className={styles.help}>
            We’ll use this to suggest library reports and open the goal chat with the right context.
          </p>
        </div>
        {taxonomy.isPending ? (
          <SkeletonText paragraph lineCount={3} />
        ) : taxonomy.isError ? (
          <ErrorState
            title="Couldn’t load industries and regions"
            message={toUserMessage(taxonomy.error)}
            onRetry={() => void taxonomy.refetch()}
          />
        ) : isEmpty ? (
          <EmptyState
            headingLevel={3}
            pictogram={<Globe aria-hidden="true" />}
            title="No industries to choose from yet"
            description="You can continue and add your research interests later in Settings."
          />
        ) : (
          <>
            <Controller
              control={control}
              name="industryIds"
              render={({ field }) => (
                <OptionMultiSelect
                  id="interests-industries"
                  titleText="Industries"
                  helperText="Choose all that apply."
                  placeholder="Search industries"
                  options={taxonomy.data.industries}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalidText={errors.industryIds?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="regionIds"
              render={({ field }) => (
                <OptionMultiSelect
                  id="interests-regions"
                  titleText="Regions"
                  helperText="Countries or cities you focus on."
                  placeholder="Search regions"
                  options={taxonomy.data.regions}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalidText={errors.regionIds?.message}
                />
              )}
            />
          </>
        )}
        <StepActions
          onBack={onBack}
          primaryLabel="Continue"
          isBusy={isBusy || taxonomy.isPending}
        />
      </Stack>
    </Form>
  );
}

function GoalStep({
  data,
  isBusy,
  onBack,
  onStart,
  onHome,
}: StepProps & { onStart: (goal: GoalType) => void; onHome: () => void }) {
  const [goal, setGoal] = useState<GoalType | null>(data.firstGoal);
  const [error, setError] = useState<string | null>(null);

  return (
    <Form
      noValidate
      aria-labelledby="goal-heading"
      onSubmit={(event) => {
        event.preventDefault();
        if (!goal) {
          setError('Choose a goal to start with, or go to your home page.');
          return;
        }
        onStart(goal);
      }}
    >
      <Stack gap={6}>
        <div>
          <h2 id="goal-heading" className={styles.stepTitle}>
            Your first goal
          </h2>
          <p className={styles.help}>
            Pick one and we’ll open a research brief for it. The AI assistant asks a few questions,
            then shows what the library already answers.
          </p>
        </div>
        <TileGroup
          legend="What decision are you working on?"
          name="first-goal"
          valueSelected={goal ?? undefined}
          onChange={(value) => {
            setGoal(value as GoalType);
            setError(null);
          }}
        >
          {(Object.keys(GOAL_DESCRIPTIONS) as GoalType[]).map((key) => (
            <RadioTile key={key} id={`goal-${key}`} value={key} className={styles.tile}>
              <span className={styles.tileTitle}>{GOAL_TYPE_LABELS[key]}</span>
              <span className={styles.tileDetail}>{GOAL_DESCRIPTIONS[key]}</span>
            </RadioTile>
          ))}
        </TileGroup>
        {error ? (
          <InlineNotification
            kind="error"
            title="Choose a goal"
            subtitle={error}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <StepActions onBack={onBack} primaryLabel="Start my first brief" isBusy={isBusy}>
          <Button kind="ghost" onClick={onHome} disabled={isBusy}>
            Go to my home page
          </Button>
        </StepActions>
      </Stack>
    </Form>
  );
}
