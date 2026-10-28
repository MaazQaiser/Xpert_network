'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Button,
  Checkbox,
  InlineNotification,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, SelectionBar, StatusTag, type StatusTone } from '@/shared/ui';
import {
  useConfirmAvailability,
  usePatchResponses,
  usePitch,
  useResponses,
} from '../../api/queries';
import type { QuestionnaireResponse, ResponsesBundle } from '../../model/journey.schema';
import type { Project } from '../../model/project.schema';
import { ProjectGate, StepHeader, StepLoading } from '../ProjectSteps/StepFrame';
import styles from './ExpertResponses.module.scss';

const MAX_PICKS = 5;

const STATUS: Record<QuestionnaireResponse['status'], { tone: StatusTone; label: string }> = {
  submitted: { tone: 'success', label: 'Answered' },
  in_progress: { tone: 'progress', label: 'In progress' },
  invited: { tone: 'neutral', label: 'Not opened' },
  declined: { tone: 'error', label: 'Declined' },
};

/** PRD screen 08: who answered, the AI's pick of 5 that cover every question, and their answers. */
export function ExpertResponses({ projectId }: { projectId: string }) {
  return (
    <ProjectGate projectId={projectId} label="Loading expert responses">
      {(project) => <ResponsesScreen project={project} />}
    </ProjectGate>
  );
}

function ResponsesScreen({ project }: { project: Project }) {
  const responses = useResponses(project.id);
  const router = useRouter();
  return (
    <AsyncBoundary
      query={responses}
      errorTitle="Expert responses didn’t load"
      loading={<StepLoading label="Loading expert responses" />}
      notFound={
        <div className={styles.root}>
          <StepHeader project={project} step="responses" title="Expert responses" />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="No responses yet."
            subtitle="Send the pitch first. Answers appear here as experts reply."
          />
          <div>
            <Button
              kind="tertiary"
              onClick={() => router.push(routes.admin.projectStep(project.id, 'pitch'))}
            >
              Back to the pitch
            </Button>
          </div>
        </div>
      }
    >
      {(data) => <ResponsesView project={project} bundle={data} />}
    </AsyncBoundary>
  );
}

function ResponsesView({ project, bundle }: { project: Project; bundle: ResponsesBundle }) {
  const router = useRouter();
  const patch = usePatchResponses(project.id);
  const confirm = useConfirmAvailability(project.id);
  const pitch = usePitch(project.id);
  const [error, setError] = useState<unknown>(null);
  const [viewing, setViewing] = useState<QuestionnaireResponse | null>(null);
  const selected = bundle.responses.filter((r) => r.selected);
  const total = project.questions.length;
  const aiCovered = new Set(
    bundle.responses
      .filter((r) => bundle.aiPickIds.includes(r.expertId))
      .flatMap((r) => r.coverage),
  ).size;
  const usingAiPicks =
    selected.length === bundle.aiPickIds.length &&
    selected.every((r) => bundle.aiPickIds.includes(r.expertId));

  const select = (selectedIds: string[]) => {
    setError(null);
    patch.mutate({ selectedIds }, { onError: (err) => setError(err) });
  };

  const toggle = (response: QuestionnaireResponse, checked: boolean) =>
    select(
      bundle.responses
        .filter((r) => (r.expertId === response.expertId ? checked : r.selected))
        .map((r) => r.expertId),
    );

  const confirmAvailability = () => {
    setError(null);
    confirm.mutate(undefined, {
      onSuccess: () => router.push(routes.admin.projectStep(project.id, 'availability')),
      onError: (err) => setError(err),
    });
  };

  const questionText = (id: string) =>
    pitch.data?.questions.find((q) => q.id === id)?.text ??
    project.questions.find((q) => q.id === id)?.text ??
    id;

  return (
    <div className={styles.root}>
      <StepHeader
        project={project}
        step="responses"
        title={`${bundle.submitted} of ${bundle.invited} experts answered`}
        subtitle="Choose up to 5 experts to offer the client. Their answers decide who’s worth a call."
      />

      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="That didn’t work."
          subtitle={toUserMessage(error)}
          onClose={() => setError(null)}
        />
      ) : null}

      <section className={styles.banner} aria-label="AI picks">
        <p className={styles.bannerText}>
          <AIExplainLabel
            summary={`Picked the ${bundle.aiPickIds.length} answered experts who together cover the most client questions.`}
            basis="Answers, quality score and compliance status"
            aria-label="AI picks"
          />{' '}
          AI picks {bundle.aiPickIds.length} experts who cover {aiCovered} of {total} questions
          between them.
        </p>
        <Button
          kind="tertiary"
          size="md"
          disabled={usingAiPicks || patch.isPending}
          onClick={() => select(bundle.aiPickIds)}
        >
          Use the AI’s picks
        </Button>
      </section>

      <div className={styles.tableWrap}>
        <Table aria-label="Expert responses" size="md">
          <TableHead>
            <TableRow>
              <TableHeader>
                <span className="cds--visually-hidden">Select</span>
              </TableHeader>
              <TableHeader>Expert</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Answered</TableHeader>
              <TableHeader>Quality</TableHeader>
              <TableHeader>Coverage</TableHeader>
              <TableHeader>Compliance</TableHeader>
              <TableHeader>
                <span className="cds--visually-hidden">Answers</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {bundle.responses.map((r) => {
              const status = STATUS[r.status];
              const canSelect = r.status === 'submitted';
              const limitReached = selected.length >= MAX_PICKS && !r.selected;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox
                      id={`pick-${r.expertId}`}
                      labelText={`Select ${r.displayId}`}
                      hideLabel
                      checked={r.selected}
                      disabled={!canSelect || limitReached}
                      onChange={(_, { checked }) => toggle(r, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className={styles.expert}>
                      {r.displayId}
                      <span className={styles.role}>
                        {r.role} · {r.country}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={status.tone} label={status.label} size="sm" />
                  </TableCell>
                  <TableCell>
                    {r.answered}/{r.total}
                  </TableCell>
                  <TableCell>{r.quality === null ? '—' : r.quality}</TableCell>
                  <TableCell>
                    {canSelect ? (
                      <span className={styles.coverage}>
                        <Tag type="blue" size="sm">
                          {r.coverage.length} of {total}
                        </Tag>
                        {bundle.aiPickIds.includes(r.expertId) ? (
                          <Tag type="purple" size="sm">
                            AI pick
                          </Tag>
                        ) : null}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Tag type={r.complianceSigned ? 'green' : 'warm-gray'} size="sm">
                      {r.complianceSigned ? 'Signed' : 'Not signed'}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      disabled={!canSelect}
                      onClick={() => setViewing(r)}
                    >
                      View answers
                      <span className="cds--visually-hidden"> from {r.displayId}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <SelectionBar
        summary={`${selected.length} of ${bundle.submitted} answered experts selected.`}
        hint="Next: confirm their times and hold the slots for 48 hours."
      >
        <Button
          size="md"
          disabled={selected.length === 0 || confirm.isPending}
          onClick={confirmAvailability}
        >
          {confirm.isPending ? 'Confirming…' : `Confirm availability for ${selected.length}`}
        </Button>
      </SelectionBar>

      {viewing
        ? createPortal(
            <Modal
              open
              passiveModal
              size="md"
              modalLabel={viewing.role}
              modalHeading={`Answers from ${viewing.displayId}`}
              onRequestClose={() => setViewing(null)}
            >
              <div>
                {viewing.answers
                  .filter((a) => a.text.trim() || a.cantSpeak)
                  .map((a) => (
                    <div key={a.questionId} className={styles.answer}>
                      <h3 className={styles.question}>{questionText(a.questionId)}</h3>
                      {a.cantSpeak ? (
                        <p className={styles.empty}>Can’t speak to this.</p>
                      ) : (
                        <p className={styles.answerText}>{a.text}</p>
                      )}
                    </div>
                  ))}
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </div>
  );
}
