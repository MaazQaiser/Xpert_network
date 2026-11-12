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

/** Create a GetSales sender profile: the identity a LinkedIn account sends outreach from. */
export function AddSenderModal({
  onClose,
  onAdded,
}: {
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

  const submit = handleSubmit((input) => create.mutate(input, { onSuccess: onAdded }));

  return createPortal(
    <Modal
      open
      size="sm"
      modalHeading="Add a LinkedIn sender"
      modalLabel="Inbox"
      primaryButtonText={create.isPending ? 'Creating…' : 'Create sender'}
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
            Each sender sends from one LinkedIn account. After adding it, connect that LinkedIn
            account before sending messages.
          </p>
          {create.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn’t create the sender."
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
