'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InlineNotification, Modal, SkeletonText, TextArea, TextInput } from '@carbon/react';
import { AIExplainLabel } from '@/shared/ai';
import { toUserMessage } from '@/shared/api';
import { useClarificationDraft, useSendClarification } from '../../api/queries';
import { clarificationSchema, type Clarification, type Project } from '../../model/project.schema';
import styles from './ProjectFile.module.scss';

type ClarificationModalProps = {
  project: Project;
  onClose: () => void;
  onSent: () => void;
};

/** "Draft clarification email" / "Ask client" (wireframe 03): AI drafts, the PM sends. */
export function ClarificationModal({ project, onClose, onSent }: ClarificationModalProps) {
  const draft = useClarificationDraft(project.id, true);
  const send = useSendClarification(project.id);
  const form = useForm<Clarification>({
    resolver: zodResolver(clarificationSchema),
    defaultValues: { to: '', subject: '', body: '' },
  });
  const { register, reset, handleSubmit, formState } = form;

  useEffect(() => {
    if (draft.data) reset(draft.data);
  }, [draft.data, reset]);

  const submit = handleSubmit((values) => send.mutate(values, { onSuccess: onSent }));
  const firstName = project.contact.name.split(' ')[0];

  return createPortal(
    <Modal
      open
      size="md"
      modalHeading={`Email ${project.contact.name}`}
      modalLabel={project.id}
      primaryButtonText={send.isPending ? 'Sending…' : `Send to ${firstName}`}
      primaryButtonDisabled={!draft.data || send.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      {draft.isPending ? (
        <div aria-busy="true" aria-label="Drafting the email">
          <SkeletonText paragraph lineCount={6} />
        </div>
      ) : draft.isError ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="The draft didn’t load."
          subtitle={toUserMessage(draft.error)}
        />
      ) : (
        <form className={styles.modalForm} onSubmit={(event) => void submit(event)} noValidate>
          <div className={styles.aiNote}>
            <AIExplainLabel
              summary="Drafted from the things that still need confirming."
              basis="Open items in Needs confirming"
              aria-label="AI-drafted email"
            />
            <span>Drafted by AI. Check it before sending.</span>
          </div>
          <TextInput id="clarify-to" labelText="To" readOnly {...register('to')} />
          <TextInput
            id="clarify-subject"
            labelText="Subject"
            invalid={Boolean(formState.errors.subject)}
            invalidText={formState.errors.subject?.message}
            {...register('subject')}
          />
          <TextArea
            id="clarify-body"
            labelText="Message"
            rows={10}
            invalid={Boolean(formState.errors.body)}
            invalidText={formState.errors.body?.message}
            helperText="Prototype: the email is saved to the email sandbox. Nothing is sent."
            {...register('body')}
          />
          {send.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="The email wasn’t sent."
              subtitle={toUserMessage(send.error)}
            />
          ) : null}
        </form>
      )}
    </Modal>,
    document.body,
  );
}
