'use client';

import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InlineNotification, Modal, Stack, TextInput } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { useCreateSenderProfile } from '../../api/queries';
import {
  createSenderProfileInputSchema,
  type CreateSenderProfileInput,
  type SenderProfile,
} from '../../model/inbox.schema';
import styles from './Inbox.module.scss';

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * First step of connecting a LinkedIn account: whose it is. This creates a sender profile (the
 * identity outreach goes from), or reuses a disconnected one with the same name, so connecting
 * the same person again doesn't leave duplicates behind.
 */
export function AddSenderModal({
  disconnected = [],
  onClose,
  onAdded,
}: {
  /** Senders whose LinkedIn was disconnected, to reconnect instead of creating another. */
  disconnected?: SenderProfile[];
  onClose: () => void;
  onAdded: (profile: SenderProfile) => void;
}) {
  const create = useCreateSenderProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSenderProfileInput>({
    resolver: zodResolver(createSenderProfileInputSchema),
    defaultValues: { firstName: '', lastName: '', label: '' },
  });

  const submit = handleSubmit((input) => {
    const existing = disconnected.find(
      (p) => sameName(p.firstName, input.firstName) && sameName(p.lastName, input.lastName),
    );
    if (existing) onAdded(existing);
    else create.mutate(input, { onSuccess: onAdded });
  });

  return createPortal(
    <Modal
      open
      size="sm"
      modalHeading="Connect a LinkedIn account"
      modalLabel="Inbox"
      primaryButtonText={create.isPending ? 'Saving…' : 'Continue'}
      primaryButtonDisabled={create.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Stack gap={6}>
          <p className={styles.modalText}>
            Whose LinkedIn account is it? Next, you’ll choose a proxy and sign in to LinkedIn.
          </p>
          {create.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn’t save the account."
              subtitle={toUserMessage(create.error)}
            />
          ) : null}
          <TextInput
            id="sender-first-name"
            labelText="First name"
            autoComplete="off"
            invalid={Boolean(errors.firstName)}
            invalidText={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextInput
            id="sender-last-name"
            labelText="Last name"
            autoComplete="off"
            invalid={Boolean(errors.lastName)}
            invalidText={errors.lastName?.message}
            {...register('lastName')}
          />
          <TextInput
            id="sender-label"
            labelText="Label (optional)"
            placeholder="e.g. PM — consumer projects"
            helperText="Sends at any hour, every day. Change it later from the sender’s schedule."
            invalid={Boolean(errors.label)}
            invalidText={errors.label?.message}
            {...register('label')}
          />
        </Stack>
      </form>
    </Modal>,
    document.body,
  );
}
