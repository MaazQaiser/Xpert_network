'use client';

import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  SkeletonText,
  Tag,
  TextArea,
} from '@carbon/react';
import { ArrowRight, CheckmarkFilled } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { formatDate } from '@/shared/lib/dates';
import { formatMinutes, formatUsd } from '@/shared/lib/money';
import { AsyncBoundary, NotFoundState, PageHeader, StatusTag } from '@/shared/ui';
import { useApply, useCall } from '../../api/queries';
import {
  MATCH_LABELS,
  MODE_LABELS,
  screeningFormSchema,
  type OpenCall,
  type ScreeningQuestion,
} from '../../model/call.schema';
import { APPLICATION_STATUS, MATCH_TAG } from '../callDisplay';
import styles from './CallDetail.module.scss';

/** F8 call detail: what the client wants, why you match, screening, and the outcome. */
export function CallDetail({ callId }: { callId: string }) {
  const call = useCall(callId);
  return (
    <AsyncBoundary
      query={call}
      errorTitle="This call didn’t load"
      notFound={
        <NotFoundState
          title="We couldn’t find that call"
          message="It may have closed or filled up. There are usually new calls every weekday."
          backHref={routes.expert.calls}
          backLabel="Back to open calls"
        />
      }
      loading={
        <div aria-busy="true" aria-label="Loading call">
          <SkeletonText heading width="60%" />
          <SkeletonText paragraph lineCount={8} />
        </div>
      }
    >
      {(data) => <DetailView call={data} />}
    </AsyncBoundary>
  );
}

function DetailView({ call }: { call: OpenCall }) {
  const application = call.application ? APPLICATION_STATUS[call.application.status] : null;
  return (
    <>
      <PageHeader
        title={call.title}
        breadcrumbs={[{ label: 'Open calls', href: routes.expert.calls }]}
        subtitle={`Published ${formatDate(call.publishedAt)}`}
        actions={
          application ? (
            <StatusTag tone={application.tone} label={application.label} />
          ) : (
            <Tag type={MATCH_TAG[call.match.level]} size="md">
              {MATCH_LABELS[call.match.level]}
            </Tag>
          )
        }
      />

      <div className={styles.layout}>
        <aside className={styles.aside} aria-label="Call details">
          <dl className={styles.facts}>
            <div>
              <dt>Fee</dt>
              <dd className={styles.fee}>{formatUsd(call.feeUsd)}</dd>
              <dd className={styles.help}>Paid once the interview is accepted</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>About {formatMinutes(call.estMinutes)}</dd>
            </div>
            <div>
              <dt>How</dt>
              <dd>{MODE_LABELS[call.mode]}, with our AI interviewer</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>{call.deadline ? formatDate(call.deadline) : 'None (evergreen)'}</dd>
            </div>
            <div>
              <dt>Spots left</dt>
              <dd>{call.spotsLeft}</dd>
            </div>
          </dl>
          {call.application ? null : (
            <Button as="a" href="#screening" kind="primary" renderIcon={ArrowRight}>
              Apply
            </Button>
          )}
        </aside>
        <div className={styles.main}>
          <Outcome call={call} />

          <section className={styles.card} aria-labelledby="brief-heading">
            <h2 id="brief-heading" className={styles.cardTitle}>
              What the client wants to know
            </h2>
            <p className={styles.body}>{call.brief}</p>
            <div>
              <h3 className={styles.subTitle}>The interview covers</h3>
              <ol className={styles.sections}>
                {call.sections.map((section) => (
                  <li key={section.id}>{section.title}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className={styles.subTitle}>Companies in scope</h3>
              <p className={styles.body}>{call.companiesInScope.join(', ')}</p>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="match-heading">
            <h2 id="match-heading" className={styles.cardTitle}>
              Why you’re a {MATCH_LABELS[call.match.level].toLowerCase()}
            </h2>
            <ul className={styles.reasons}>
              {call.match.reasons.map((reason) => (
                <li key={reason}>
                  <CheckmarkFilled className={styles.reasonIcon} aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
            <p className={styles.help}>
              Matched on the industries, topics and regions in your profile.{' '}
              <Link href={routes.expert.profile}>Update your expertise</Link>
            </p>
          </section>

          {call.application ? null : <ScreeningForm call={call} />}
        </div>
      </div>
    </>
  );
}

function Outcome({ call }: { call: OpenCall }) {
  const application = call.application;
  if (!application) return null;
  if (application.status === 'approved' && application.interviewId) {
    return (
      <section className={styles.outcome} aria-labelledby="outcome-heading">
        <h2 id="outcome-heading" className={styles.cardTitle}>
          You’re in
        </h2>
        <p className={styles.body}>
          Start whenever suits you{call.deadline ? ` before ${formatDate(call.deadline)}` : ''}. It
          takes about {formatMinutes(call.estMinutes)}, and you can pause at any time.
        </p>
        <div>
          <Button
            as={Link}
            href={routes.expert.interview(application.interviewId)}
            renderIcon={ArrowRight}
          >
            Start interview
          </Button>
        </div>
      </section>
    );
  }
  if (application.status === 'applied') {
    return (
      <InlineNotification
        kind="info"
        title="Application under review"
        subtitle={application.note ?? 'We’ll let you know as soon as it’s decided.'}
        lowContrast
        hideCloseButton
      />
    );
  }
  return (
    <section className={styles.notEligible} aria-labelledby="outcome-heading">
      <h2 id="outcome-heading" className={styles.cardTitle}>
        This call isn’t a fit this time
      </h2>
      <p className={styles.body}>{application.note}</p>
      <div>
        <Button as={Link} href={routes.expert.calls} kind="tertiary">
          Browse other calls
        </Button>
      </div>
    </section>
  );
}

const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

function ScreeningForm({ call }: { call: OpenCall }) {
  const apply = useApply(call.id);
  const schema = screeningFormSchema(call.screening);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(call.screening.map((q) => [q.id, ''])),
  });

  const submit = handleSubmit((answers) => apply.mutate({ answers }));

  return (
    <section
      id="screening"
      className={styles.card}
      aria-labelledby="screening-heading"
      tabIndex={-1}
    >
      <h2 id="screening-heading" className={styles.cardTitle}>
        Apply: {call.screening.length} short{' '}
        {call.screening.length === 1 ? 'question' : 'questions'}
      </h2>
      <p className={styles.help}>
        Answers go to our team, not the client. Some calls approve you straight away.
      </p>
      <Form
        onSubmit={(event) => void submit(event)}
        className={styles.form}
        aria-label="Screening questions"
        noValidate
      >
        {call.screening.map((question) => (
          <Controller
            key={question.id}
            control={control}
            name={question.id}
            render={({ field }) => (
              <QuestionField
                question={question}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors[question.id]?.message}
              />
            )}
          />
        ))}
        {apply.isError ? (
          <InlineNotification
            kind="error"
            title="Your application didn’t send"
            subtitle={`${toUserMessage(apply.error)} Your answers are still here.`}
            lowContrast
            hideCloseButton
          />
        ) : null}
        <div>
          <Button type="submit" disabled={apply.isPending}>
            {apply.isPending ? 'Sending…' : 'Submit application'}
          </Button>
        </div>
      </Form>
    </section>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  onBlur,
  error,
}: {
  question: ScreeningQuestion;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
}) {
  if (question.kind === 'text') {
    return (
      <TextArea
        id={`screen-${question.id}`}
        labelText={question.text}
        helperText={question.hint}
        rows={3}
        maxCount={600}
        enableCounter
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        invalid={Boolean(error)}
        invalidText={error}
      />
    );
  }
  const options = question.kind === 'yes_no' ? YES_NO : question.options;
  return (
    <RadioButtonGroup
      legendText={question.text}
      name={`screen-${question.id}`}
      orientation={question.kind === 'yes_no' ? 'horizontal' : 'vertical'}
      valueSelected={value}
      onChange={(next) => onChange(String(next))}
      invalid={Boolean(error)}
      invalidText={error}
    >
      {options.map((option) => (
        <RadioButton
          key={option.id}
          id={`screen-${question.id}-${option.id}`}
          value={option.id}
          labelText={option.label}
        />
      ))}
    </RadioButtonGroup>
  );
}
