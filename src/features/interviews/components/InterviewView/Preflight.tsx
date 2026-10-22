'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  Form,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
} from '@carbon/react';
import { ArrowRight, Microphone } from '@carbon/icons-react';
import { isApiError, toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatMinutes, formatUsd } from '@/shared/lib/money';
import { PageHeader } from '@/shared/ui';
import { useMicCheck, useStartInterview } from '../../api/queries';
import {
  LANGUAGES,
  preflightSchema,
  type Interview,
  type PreflightInput,
} from '../../model/interview.schema';
import styles from './InterviewView.module.scss';

/** F9 step 1: topic, time, fee, mode, mic check, language and the compliance reminder. */
export function Preflight({ interview }: { interview: Interview }) {
  const start = useStartInterview(interview.id);
  const canVoice = interview.allowedModes.includes('voice');
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PreflightInput>({
    resolver: zodResolver(preflightSchema),
    defaultValues: {
      mode: canVoice ? 'voice' : 'text',
      language: 'en',
      acceptCompliance: false,
    },
  });
  const mode = useWatch({ control, name: 'mode' });
  const mic = useMicCheck(mode === 'voice');
  const micDenied = mode === 'voice' && mic.data?.granted === false;
  const micDeniedByServer = isApiError(start.error) && start.error.code === 'mic_denied';

  const submit = handleSubmit((values) => start.mutate(values));

  return (
    <>
      <PageHeader
        title={interview.callTitle}
        breadcrumbs={[{ label: 'Interview requests', href: routes.expert.calls }]}
        subtitle="Before you start"
      />
      <div className={styles.preflight}>
        <section className={styles.card} aria-labelledby="about-heading">
          <h2 id="about-heading" className={styles.cardTitle}>
            What to expect
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Time</dt>
              <dd>About {formatMinutes(interview.estMinutes)}, and you can pause</dd>
            </div>
            <div>
              <dt>Fee</dt>
              <dd>{formatUsd(interview.feeUsd)}, paid once the interview is accepted</dd>
            </div>
            <div>
              <dt>Sections</dt>
              <dd>{interview.sections.map((s) => s.title).join(' · ')}</dd>
            </div>
          </dl>
          <p className={styles.help}>
            Our AI interviewer asks the questions and may follow up. At the end you’ll check a
            summary of each section before anything is sent.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="setup-heading">
          <h2 id="setup-heading" className={styles.cardTitle}>
            Set up
          </h2>
          <Form
            onSubmit={(event) => void submit(event)}
            className={styles.form}
            aria-label="Interview set-up"
            noValidate
          >
            <Controller
              control={control}
              name="mode"
              render={({ field }) => (
                <RadioButtonGroup
                  legendText="How would you like to answer?"
                  name="interview-mode"
                  orientation="horizontal"
                  valueSelected={field.value}
                  onChange={(value) => field.onChange(value)}
                  helperText={
                    canVoice ? 'You can switch during the interview.' : 'This call is text only.'
                  }
                >
                  <RadioButton
                    id="mode-voice"
                    value="voice"
                    labelText="Voice"
                    disabled={!canVoice}
                  />
                  <RadioButton id="mode-text" value="text" labelText="Text" />
                </RadioButtonGroup>
              )}
            />

            {mode === 'voice' ? (
              <div className={styles.micCheck} aria-live="polite">
                {mic.isFetching ? (
                  <InlineLoading description="Checking your microphone…" />
                ) : micDenied || micDeniedByServer ? (
                  <InlineNotification
                    kind="warning"
                    title="We can’t use your microphone"
                    subtitle="Your browser didn’t allow it. You can do this interview by text — the questions are the same."
                    lowContrast
                    hideCloseButton
                  />
                ) : mic.data?.granted ? (
                  <p className={styles.micOk}>
                    <Microphone aria-hidden="true" /> Microphone works.
                  </p>
                ) : null}
                {micDenied || micDeniedByServer ? (
                  <div>
                    <Button kind="tertiary" size="md" onClick={() => setValue('mode', 'text')}>
                      Answer by text instead
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button kind="ghost" size="sm" onClick={() => void mic.refetch()}>
                      Check again
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select
                  id="interview-language"
                  labelText="Language"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={styles.language}
                >
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id} text={l.label} />
                  ))}
                </Select>
              )}
            />

            <div className={styles.compliance}>
              <h3 className={styles.subTitle}>Keep it public</h3>
              <p className={styles.help}>
                Share what you know from experience, not documents or numbers your employer or
                clients keep private. Ranges and estimates are perfect. If a question asks for
                something you can’t share, say so — it won’t count against you.
              </p>
              <Controller
                control={control}
                name="acceptCompliance"
                render={({ field }) => (
                  <Checkbox
                    id="accept-compliance"
                    labelText="I won’t share confidential or non-public information."
                    checked={field.value}
                    onChange={(_, { checked }) => field.onChange(checked)}
                    invalid={Boolean(errors.acceptCompliance)}
                    invalidText={errors.acceptCompliance?.message}
                  />
                )}
              />
            </div>

            {start.isError && !micDeniedByServer ? (
              <InlineNotification
                kind="error"
                title="The interview didn’t start"
                subtitle={toUserMessage(start.error)}
                lowContrast
                hideCloseButton
              />
            ) : null}

            <div>
              <Button
                type="submit"
                renderIcon={ArrowRight}
                disabled={
                  start.isPending || (mode === 'voice' && (micDenied || !mic.data?.granted))
                }
              >
                {start.isPending ? 'Starting…' : 'Start interview'}
              </Button>
            </div>
          </Form>
        </section>
      </div>
    </>
  );
}
