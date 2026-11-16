'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import {
  FeatureFlags,
  InlineNotification,
  MenuItem,
  Modal,
  OverflowMenu,
  Stack,
  TextInput,
} from '@carbon/react';
import { OverflowMenuHorizontal } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useDeleteScioChat, useRenameScioChat } from '../../api/queries';
import type { ScioConversation } from '../../model/home.schema';
import styles from './AdminConsoleShell.module.scss';

const MAX_TITLE = 60;

function RenameChatModal({ chat, onClose }: { chat: ScioConversation; onClose: () => void }) {
  const rename = useRenameScioChat();
  const [title, setTitle] = useState(chat.title);
  const [isBlank, setIsBlank] = useState(false);

  const save = () => {
    const name = title.trim();
    if (!name) {
      setIsBlank(true);
      return;
    }
    if (name === chat.title) {
      onClose();
      return;
    }
    rename.mutate({ id: chat.id, title: name }, { onSuccess: onClose });
  };

  return createPortal(
    <Modal
      open
      size="xs"
      modalHeading="Rename chat"
      primaryButtonText={rename.isPending ? 'Saving…' : 'Save'}
      primaryButtonDisabled={rename.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={save}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        noValidate
      >
        <Stack gap={5}>
          <TextInput
            id={`rename-chat-${chat.id}`}
            labelText="Chat name"
            value={title}
            maxLength={MAX_TITLE}
            data-modal-primary-focus
            invalid={isBlank}
            invalidText="Give the chat a name."
            onChange={(event) => {
              setTitle(event.target.value);
              setIsBlank(false);
            }}
          />
          {rename.isError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Couldn’t rename the chat."
              subtitle={toUserMessage(rename.error)}
            />
          ) : null}
        </Stack>
      </form>
    </Modal>,
    document.body,
  );
}

function DeleteChatModal({
  chat,
  onClose,
  onDeleted,
}: {
  chat: ScioConversation;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteScioChat();
  return createPortal(
    <Modal
      open
      danger
      size="xs"
      modalHeading={`Delete “${chat.title}”?`}
      primaryButtonText={remove.isPending ? 'Deleting…' : 'Delete'}
      primaryButtonDisabled={remove.isPending}
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => remove.mutate(chat.id, { onSuccess: onDeleted })}
    >
      <Stack gap={5}>
        <p className={styles.modalText}>
          The chat and Scio’s memory of it are deleted. This can’t be undone.
        </p>
        {remove.isError ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Couldn’t delete the chat."
            subtitle={toUserMessage(remove.error)}
          />
        ) : null}
      </Stack>
    </Modal>,
    document.body,
  );
}

/** A chat's ⋯ menu in the side nav: rename it or delete it. */
export function ChatNavMenu({ chat }: { chat: ScioConversation }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);

  return (
    <>
      <FeatureFlags enableV12Overflowmenu>
        <OverflowMenu
          size="sm"
          menuAlignment="bottom-end"
          // Floating placement: Carbon's older placement shifts bottom-end menus far right.
          autoAlign
          renderIcon={OverflowMenuHorizontal}
          label={`Options for ${chat.title}`}
        >
          <MenuItem label="Rename" onClick={() => setDialog('rename')} />
          <MenuItem label="Delete" kind="danger" onClick={() => setDialog('delete')} />
        </OverflowMenu>
      </FeatureFlags>
      {dialog === 'rename' ? <RenameChatModal chat={chat} onClose={() => setDialog(null)} /> : null}
      {dialog === 'delete' ? (
        <DeleteChatModal
          chat={chat}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            // The open chat is gone: back to Home and a new chat.
            if (pathname === routes.admin.homeChat(chat.id)) router.push(routes.admin.home);
          }}
        />
      ) : null}
    </>
  );
}
