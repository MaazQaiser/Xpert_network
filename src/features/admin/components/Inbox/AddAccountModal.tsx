'use client';

import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  InlineNotification,
  Modal,
  RadioButton,
  RadioButtonGroup,
  Stack,
  TextInput,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { useAddMailAccount } from '../../api/queries';
import {
  addMailAccountInputSchema,
  MAIL_PROVIDER_LABELS,
  mailProviderSchema,
  type AddMailAccountInput,
} from '../../model/inbox.schema';
import styles from './Inbox.module.scss';

/** Connect another mailbox for the AI to watch. The prototype skips the provider's sign-in. */
export function AddAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (address: string) => void;
}) {
  const add = useAddMailAccount();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMailAccountInput>({
    resolver: zodResolver(addMailAccountInputSchema),
    defaultValues: { provider: 'google', address: '' },
  });

  const submit = handleSubmit((input) =>
    add.mutate(input, { onSuccess: (account) => onAdded(account.address) }),
  );

  return createPortal(
    <Modal
      open
      size="sm"
      modalHeading="Connect another mailbox"
      modalLabel="Inbox"
      primaryButtonText={add.isPending ? 'Connecting…' : 'Connect mailbox'}
      primaryButtonDisabled={add.isPending}
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
            The AI reads new client emails in this mailbox and drafts project files from them. It
            never sends from it without you.
          </p>
          {add.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn’t connect it."
              subtitle={toUserMessage(add.error)}
            />
          ) : null}
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <RadioButtonGroup
                legendText="Email provider"
                name="mail-provider"
                orientation="vertical"
                valueSelected={field.value}
                onChange={(value) => field.onChange(value)}
              >
                {mailProviderSchema.options.map((provider) => (
                  <RadioButton
                    key={provider}
                    id={`provider-${provider}`}
                    value={provider}
                    labelText={MAIL_PROVIDER_LABELS[provider]}
                  />
                ))}
              </RadioButtonGroup>
            )}
          />
          <TextInput
            id="mailbox-address"
            labelText="Mailbox address"
            placeholder="e.g. briefs@xpertnetwork.example"
            helperText="Prototype: no sign-in. The mailbox is connected straight away."
            invalid={Boolean(errors.address)}
            invalidText={errors.address?.message}
            {...register('address')}
          />
        </Stack>
      </form>
    </Modal>,
    document.body,
  );
}
