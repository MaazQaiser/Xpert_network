'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Form,
  InlineNotification,
  Layer,
  ProgressIndicator,
  ProgressIndicatorSkeleton,
  ProgressStep,
  SkeletonText,
  Stack,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useBreakpointUp } from '@/shared/hooks/useMediaQuery';
import { AsyncBoundary, PageHeader } from '@/shared/ui';
import {
  useExpertOnboarding,
  useGoToExpertStep,
  useSaveExpertStep,
  useSubmitExpertProfile,
} from '../../api/queries';
import {
  EXPERT_STEP_IDS,
  EXPERT_STEP_LABELS,
  missingSections,
  REVIEW_BUSINESS_DAYS,
  type ExpertOnboarding,
  type ExpertStep,
  type ExpertStepInput,
} from '../../model/expert.schema';
import { ExpertProfileSummary } from '../ExpertProfileSummary/ExpertProfileSummary';
import { StepActions } from '../StepActions/StepActions';
import { BasicsStep, ComplianceStep, ExpertiseStep, WorkStep } from './ExpertSteps';
import styles from './ExpertOnboardingFlow.module.scss';

/** F7 expert onboarding: Basics → Work history → Expertise & regions → Compliance → Submit. */
export function ExpertOnboardingFlow() {
  const profile = useExpertOnboarding();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Set up your expert profile"
        subtitle={`Five short steps. We review every profile within ${REVIEW_BUSINESS_DAYS} business days. Your answers save as you go.`}
      />
      <AsyncBoundary
        query={profile}
        errorTitle="Couldn’t load your profile"
        loading={
          <div aria-busy="true" aria-label="Loading your profile">
            <ProgressIndicatorSkeleton />
            <SkeletonText paragraph lineCount={5} className={styles.skeleton} />
          </div>
        }
      >
        {(data) => <ExpertOnboardingView profile={data} />}
      </AsyncBoundary>
    </div>
  );
}

function ExpertOnboardingView({ profile }: { profile: ExpertOnboarding }) {
  const router = useRouter();
  const save = useSaveExpertStep();
  const goTo = useGoToExpertStep();
  const submit = useSubmitExpertProfile();
  const isVertical = useBreakpointUp('lg');

  if (profile.status === 'pending' || profile.status === 'approved') {
    return (
      <Stack gap={5}>
        <InlineNotification
          kind="info"
          title={profile.status === 'approved' ? 'You’re approved' : 'Your profile is in review'}
          subtitle="Your profile is locked while it’s reviewed or live. Contact support to change it."
          lowContrast
          hideCloseButton
        />
        <div>
          <Button
            as={Link}
            href={profile.status === 'approved' ? routes.expert.home : routes.expert.pending}
          >
            {profile.status === 'approved' ? 'Go to expert home' : 'See review status'}
          </Button>
        </div>
      </Stack>
    );
  }

  const step = profile.currentStep;
  const index = EXPERT_STEP_IDS.indexOf(step);
  const isBusy = save.isPending || goTo.isPending || submit.isPending;
  const error = save.error ?? goTo.error ?? submit.error;
  const back = (target: ExpertStep) => () => goTo.mutate(target);
  const saveStep = (input: ExpertStepInput) => save.mutate(input);
  const isDone = (id: ExpertStep) =>
    id === 'submit' ? missingSections(profile).length === 0 : profile[id] !== null;

  return (
    <div className={isVertical ? styles.layout : undefined}>
      <nav aria-label="Profile steps" className={styles.stepperNav}>
        <ProgressIndicator
          currentIndex={index}
          vertical={isVertical}
          onChange={(next: number) => {
            const target = EXPERT_STEP_IDS[next];
            if (target && !isBusy && (next < index || isDone(target))) {
              goTo.mutate(target);
            }
          }}
        >
          {EXPERT_STEP_IDS.map((id, i) => {
            const isComplete = id !== 'submit' && isDone(id);
            return (
              <ProgressStep
                key={id}
                label={EXPERT_STEP_LABELS[id]}
                secondaryLabel={isVertical && isComplete ? 'Complete' : undefined}
                description={`Step ${i + 1} of ${EXPERT_STEP_IDS.length}: ${EXPERT_STEP_LABELS[id]}${isComplete ? ', complete' : ''}`}
                complete={isComplete && i !== index}
                disabled={!isDone(id) && i > index}
              />
            );
          })}
        </ProgressIndicator>
      </nav>

      <Stack gap={6}>
        {profile.decisionNote ? (
          <InlineNotification
            kind="warning"
            title="What to change before you resubmit"
            subtitle={profile.decisionNote}
            lowContrast
            hideCloseButton
          />
        ) : null}
        {error ? (
          <InlineNotification
            kind="error"
            title="Couldn’t save"
            subtitle={`${toUserMessage(error)} Your answers are still here.`}
            lowContrast
            onCloseButtonClick={() => {
              save.reset();
              goTo.reset();
              submit.reset();
            }}
          />
        ) : null}

        <Layer className={styles.card}>
          {step === 'basics' ? (
            <BasicsStep
              profile={profile}
              isBusy={isBusy}
              onSubmit={(data) => saveStep({ step: 'basics', data })}
            />
          ) : step === 'work' ? (
            <WorkStep
              profile={profile}
              isBusy={isBusy}
              onBack={back('basics')}
              onSubmit={(data) => saveStep({ step: 'work', data })}
            />
          ) : step === 'expertise' ? (
            <ExpertiseStep
              profile={profile}
              isBusy={isBusy}
              onBack={back('work')}
              onSubmit={(data) => saveStep({ step: 'expertise', data })}
            />
          ) : step === 'compliance' ? (
            <ComplianceStep
              profile={profile}
              isBusy={isBusy}
              onBack={back('expertise')}
              onSubmit={(data) => saveStep({ step: 'compliance', data })}
            />
          ) : (
            <ReviewStep
              profile={profile}
              isBusy={isBusy}
              onBack={back('compliance')}
              onEdit={(target) => goTo.mutate(target)}
              onSubmit={() =>
                submit.mutate(undefined, { onSuccess: () => router.push(routes.expert.pending) })
              }
            />
          )}
        </Layer>
      </Stack>
    </div>
  );
}

type ReviewStepProps = {
  profile: ExpertOnboarding;
  isBusy: boolean;
  onBack: () => void;
  onEdit: (step: Exclude<ExpertStep, 'submit'>) => void;
  onSubmit: () => void;
};

function ReviewStep({ profile, isBusy, onBack, onEdit, onSubmit }: ReviewStepProps) {
  const missing = missingSections(profile);
  return (
    <Form
      noValidate
      aria-labelledby="review-heading"
      onSubmit={(event) => {
        event.preventDefault();
        if (missing.length === 0) onSubmit();
      }}
    >
      <Stack gap={6}>
        <div>
          <h2 id="review-heading" className={styles.stepTitle}>
            Check and submit
          </h2>
          <p className={styles.help}>
            Our team checks your experience and conflicts, then approves you for open calls. You
            can’t edit your profile while it’s in review.
          </p>
        </div>
        {missing.length > 0 ? (
          <InlineNotification
            kind="warning"
            title="Some steps aren’t finished"
            subtitle={`Complete ${missing.map((s) => EXPERT_STEP_LABELS[s]).join(', ')} to submit.`}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <ExpertProfileSummary profile={profile} onEdit={onEdit} />
        <StepActions
          onBack={onBack}
          primaryLabel="Submit for review"
          isBusy={isBusy || missing.length > 0}
        />
      </Stack>
    </Form>
  );
}
