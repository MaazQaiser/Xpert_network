'use client';

import { createPortal } from 'react-dom';
import { InlineNotification, Modal, Stack } from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import { useDisconnectLinkedin } from '../../api/queries';
import { senderName, type SenderProfile } from '../../model/inbox.schema';
import styles from './Inbox.module.scss';

/**
 * Sign a sender out of LinkedIn. Nothing here can undo it: connecting the account again means
 * signing in to LinkedIn again, so the dialog says what stops working before anything happens.
 */
export function DisconnectSenderModal({
  sender,
  onClose,
}: {
  sender: SenderProfile;
  onClose: () => void;
}) {
  const disconnect = useDisconnectLinkedin(sender.uuid);
  const name = senderName(sender);

  return createPortal(
    <Modal
      open
      danger
      size="sm"
      modalHeading={`Disconnect ${name}’s LinkedIn?`}
      modalLabel="LinkedIn sender"
      primaryButtonText={disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
      primaryButtonDisabled={disconnect.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => disconnect.mutate(undefined, { onSuccess: () => onClose() })}
    >
      <Stack gap={5}>
        <p className={styles.modalText}>
          This signs {name} out of LinkedIn here. Messages and connection requests still waiting to
          go out won’t be sent, and new replies stop arriving.
        </p>
        <p className={styles.modalText}>
          To use this account again, it has to be connected and signed in to LinkedIn again.
        </p>
        {disconnect.isError ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Couldn’t disconnect LinkedIn."
            subtitle={toUserMessage(disconnect.error)}
          />
        ) : null}
      </Stack>
    </Modal>,
    document.body,
  );
}
