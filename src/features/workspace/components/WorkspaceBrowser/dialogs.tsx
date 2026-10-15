'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Checkbox,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Tag,
  TextInput,
} from '@carbon/react';
import { toUserMessage } from '@/shared/api';
import {
  useCreateFolder,
  useCreateLabel,
  useDeleteFolder,
  useDeleteLabel,
  useUpdateFolder,
  useUpdateItems,
  useUpdateLabel,
} from '../../api/queries';
import {
  childFolders,
  folderDestinations,
  folderOptions,
  folderPathLabel,
  itemTitleSchema,
  LABEL_COLOR_NAMES,
  LABEL_COLORS,
  labelInputSchema,
  type Folder,
  type ItemsPatch,
  type Label,
  type LabelInput,
  type Workspace,
  type WorkspaceItem,
} from '../../model/workspace.schema';
import styles from './WorkspaceBrowser.module.scss';

export type WorkspaceDialog =
  | { kind: 'new-folder'; parentId: string | null }
  | { kind: 'rename-folder'; folder: Folder }
  | { kind: 'move-folder'; folder: Folder }
  | { kind: 'delete-folder'; folder: Folder }
  | { kind: 'new-label' }
  | { kind: 'edit-label'; label: Label }
  | { kind: 'delete-label'; label: Label }
  | { kind: 'move-items'; keys: string[] }
  | { kind: 'label-items'; keys: string[] }
  | { kind: 'rename-item'; item: WorkspaceItem };

/** What a finished dialog tells the page: a status line, an optional undo, where to go next. */
export type DialogResult = {
  message: string;
  undo?: ItemsPatch[];
  /** A view to open, e.g. the folder just created. */
  view?: string;
  /** The folder ids that no longer exist. */
  deletedFolderIds?: string[];
};

type DialogProps = {
  dialog: WorkspaceDialog;
  workspace: Workspace;
  onClose: () => void;
  onDone: (result: DialogResult) => void;
};

const TOP_LEVEL = '';
const NOT_IN_A_FOLDER = '';

/** Modals are portalled so a sticky ancestor can't trap them in its stacking context. */
export function WorkspaceDialogs(props: DialogProps) {
  return createPortal(<DialogSwitch {...props} />, document.body);
}

function DialogSwitch(props: DialogProps) {
  const { dialog } = props;
  switch (dialog.kind) {
    case 'new-folder':
      return <FolderNameDialog {...props} parentId={dialog.parentId} />;
    case 'rename-folder':
      return (
        <FolderNameDialog {...props} folder={dialog.folder} parentId={dialog.folder.parentId} />
      );
    case 'move-folder':
      return <MoveFolderDialog {...props} folder={dialog.folder} />;
    case 'delete-folder':
      return <DeleteFolderDialog {...props} folder={dialog.folder} />;
    case 'new-label':
      return <LabelDialog {...props} />;
    case 'edit-label':
      return <LabelDialog {...props} label={dialog.label} />;
    case 'delete-label':
      return <DeleteLabelDialog {...props} label={dialog.label} />;
    case 'move-items':
      return <MoveItemsDialog {...props} keys={dialog.keys} />;
    case 'label-items':
      return <LabelItemsDialog {...props} keys={dialog.keys} />;
    case 'rename-item':
      return <RenameItemDialog {...props} item={dialog.item} />;
  }
}

function MutationError({ error, title }: { error: unknown; title: string }) {
  if (!error) return null;
  return (
    <InlineNotification
      kind="error"
      title={title}
      subtitle={toUserMessage(error)}
      lowContrast
      hideCloseButton
      className={styles.dialogNotice}
    />
  );
}

function itemCount(n: number) {
  return `${n} ${n === 1 ? 'item' : 'items'}`;
}

/** Restores each item's earlier value of one field, grouping items that shared it. */
function restorePatches<T>(
  items: WorkspaceItem[],
  read: (item: WorkspaceItem) => T,
  toPatch: (value: T) => Omit<ItemsPatch, 'keys'>,
): ItemsPatch[] {
  const groups = new Map<string, { value: T; keys: string[] }>();
  for (const item of items) {
    const value = read(item);
    const id = JSON.stringify(value);
    const group = groups.get(id) ?? { value, keys: [] };
    group.keys.push(item.key);
    groups.set(id, group);
  }
  return [...groups.values()].map(({ value, keys }) => ({ keys, ...toPatch(value) }));
}

export function archiveUndo(items: WorkspaceItem[]): ItemsPatch[] {
  return restorePatches(
    items,
    (item) => item.pinned,
    (pinned) => ({ archived: false, pinned }),
  );
}

const folderFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the folder.').max(60, 'Keep folder names to 60 characters.'),
  parentId: z.string(),
});
type FolderFormValues = z.infer<typeof folderFormSchema>;

function FolderNameDialog({
  workspace,
  folder,
  parentId,
  onClose,
  onDone,
}: DialogProps & { folder?: Folder; parentId: string | null }) {
  const create = useCreateFolder();
  const update = useUpdateFolder();
  const isRename = Boolean(folder);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: { name: folder?.name ?? '', parentId: parentId ?? TOP_LEVEL },
  });
  const pending = create.isPending || update.isPending;
  // New folders can go at the top level or inside a top-level folder.
  const parents = childFolders(workspace.folders, null);

  const submit = handleSubmit(({ name, parentId: parent }) => {
    const trimmed = name.trim();
    if (folder) {
      update.mutate(
        { id: folder.id, name: trimmed },
        { onSuccess: () => onDone({ message: `Renamed the folder to “${trimmed}”.` }) },
      );
      return;
    }
    const target = parent === TOP_LEVEL ? null : parent;
    create.mutate(
      { name: trimmed, parentId: target },
      {
        onSuccess: (next) => {
          const created = next.folders.find((f) => f.name === trimmed && f.parentId === target);
          onDone({
            message: `Created “${trimmed}”. Select items and choose Move to folder to fill it.`,
            ...(created ? { view: created.id } : {}),
          });
        },
      },
    );
  });

  return (
    <Modal
      open
      size="sm"
      modalHeading={isRename ? 'Rename folder' : 'New folder'}
      primaryButtonText={isRename ? 'Save name' : 'Create folder'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={pending}
      shouldSubmitOnEnter
      selectorPrimaryFocus="#folder-name"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <div className={styles.dialogBody}>
        <TextInput
          id="folder-name"
          labelText="Folder name"
          placeholder="e.g. Riyadh expansion"
          maxCount={60}
          enableCounter
          invalid={Boolean(errors.name)}
          invalidText={errors.name?.message}
          {...register('name')}
        />
        {!isRename ? (
          <Controller
            control={control}
            name="parentId"
            render={({ field }) => (
              <Select
                id="folder-parent"
                labelText="Put it in"
                helperText="Folders go two levels deep."
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
              >
                <SelectItem value={TOP_LEVEL} text="Top level" />
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id} text={parent.name} />
                ))}
              </Select>
            )}
          />
        ) : null}
        <MutationError
          error={create.error ?? update.error}
          title={isRename ? 'Couldn’t rename the folder' : 'Couldn’t create the folder'}
        />
      </div>
    </Modal>
  );
}

function MoveFolderDialog({
  workspace,
  folder,
  onClose,
  onDone,
}: DialogProps & { folder: Folder }) {
  const update = useUpdateFolder();
  const destinations = folderDestinations(workspace.folders, folder.id);
  const hasChildren = workspace.folders.some((f) => f.parentId === folder.id);
  const [target, setTarget] = useState(folder.parentId ?? TOP_LEVEL);

  const submit = () => {
    const parentId = target === TOP_LEVEL ? null : target;
    update.mutate(
      { id: folder.id, parentId },
      {
        onSuccess: () =>
          onDone({
            message: `Moved “${folder.name}” to ${parentId ? `“${folderPathLabel(workspace.folders, parentId)}”` : 'the top level'}.`,
          }),
      },
    );
  };

  return (
    <Modal
      open
      size="sm"
      modalHeading={`Move “${folder.name}”`}
      primaryButtonText="Move folder"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={update.isPending || target === (folder.parentId ?? TOP_LEVEL)}
      selectorPrimaryFocus="#folder-destination"
      onRequestClose={onClose}
      onRequestSubmit={submit}
    >
      <div className={styles.dialogBody}>
        <Select
          id="folder-destination"
          labelText="Move to"
          helperText={
            hasChildren
              ? 'This folder has subfolders, so it stays at the top level.'
              : 'Folders go two levels deep.'
          }
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {destinations.map((destination) => (
            <SelectItem
              key={destination?.id ?? TOP_LEVEL}
              value={destination?.id ?? TOP_LEVEL}
              text={destination?.name ?? 'Top level'}
            />
          ))}
        </Select>
        <MutationError error={update.error} title="Couldn’t move the folder" />
      </div>
    </Modal>
  );
}

function DeleteFolderDialog({
  workspace,
  folder,
  onClose,
  onDone,
}: DialogProps & { folder: Folder }) {
  const remove = useDeleteFolder();
  const subfolders = childFolders(workspace.folders, folder.id);
  const ids = [folder.id, ...subfolders.map((f) => f.id)];
  const count = workspace.items.filter((i) => i.folderId && ids.includes(i.folderId)).length;

  return (
    <Modal
      open
      danger
      size="sm"
      modalHeading={`Delete “${folder.name}”?`}
      primaryButtonText={remove.isPending ? 'Deleting…' : 'Delete folder'}
      secondaryButtonText="Keep it"
      primaryButtonDisabled={remove.isPending}
      onRequestClose={onClose}
      onRequestSubmit={() =>
        remove.mutate(folder.id, {
          onSuccess: () =>
            onDone({
              message:
                `Deleted “${folder.name}”. ${count ? `Its ${itemCount(count)} are now in Not in a folder.` : ''}`.trim(),
              deletedFolderIds: ids,
            }),
        })
      }
    >
      <div className={styles.dialogBody}>
        <p>
          {subfolders.length
            ? `This also deletes its ${subfolders.length === 1 ? 'subfolder' : `${subfolders.length} subfolders`}. `
            : ''}
          {count
            ? `The ${itemCount(count)} inside move to Not in a folder. `
            : 'The folder is empty. '}
          Nothing is removed from your library or requests.
        </p>
        <MutationError error={remove.error} title="Couldn’t delete the folder" />
      </div>
    </Modal>
  );
}

function LabelDialog({ label, onClose, onDone }: DialogProps & { label?: Label }) {
  const create = useCreateLabel();
  const update = useUpdateLabel();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LabelInput>({
    resolver: zodResolver(labelInputSchema),
    defaultValues: { name: label?.name ?? '', color: label?.color ?? 'blue' },
  });
  const [name, color] = useWatch({ control, name: ['name', 'color'] });
  const pending = create.isPending || update.isPending;

  const submit = handleSubmit((values) => {
    const done = () =>
      onDone({
        message: label
          ? `Updated the label “${values.name}”.`
          : `Created the label “${values.name}”.`,
      });
    if (label) update.mutate({ id: label.id, ...values }, { onSuccess: done });
    else create.mutate(values, { onSuccess: done });
  });

  return (
    <Modal
      open
      size="sm"
      modalHeading={label ? 'Edit label' : 'New label'}
      primaryButtonText={label ? 'Save label' : 'Create label'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={pending}
      shouldSubmitOnEnter
      selectorPrimaryFocus="#label-name"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <div className={styles.dialogBody}>
        <TextInput
          id="label-name"
          labelText="Label name"
          placeholder="e.g. For the board"
          maxCount={30}
          enableCounter
          invalid={Boolean(errors.name)}
          invalidText={errors.name?.message}
          {...register('name')}
        />
        <Select id="label-color" labelText="Colour" {...register('color')}>
          {LABEL_COLORS.map((c) => (
            <SelectItem key={c} value={c} text={LABEL_COLOR_NAMES[c]} />
          ))}
        </Select>
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Preview</span>
          <Tag type={color} size="md">
            {name.trim() || 'Label'}
          </Tag>
        </div>
        <MutationError
          error={create.error ?? update.error}
          title={label ? 'Couldn’t save the label' : 'Couldn’t create the label'}
        />
      </div>
    </Modal>
  );
}

function DeleteLabelDialog({ workspace, label, onClose, onDone }: DialogProps & { label: Label }) {
  const remove = useDeleteLabel();
  const count = workspace.items.filter((i) => i.labelIds.includes(label.id)).length;
  return (
    <Modal
      open
      danger
      size="sm"
      modalHeading={`Delete the label “${label.name}”?`}
      primaryButtonText={remove.isPending ? 'Deleting…' : 'Delete label'}
      secondaryButtonText="Keep it"
      primaryButtonDisabled={remove.isPending}
      onRequestClose={onClose}
      onRequestSubmit={() =>
        remove.mutate(label.id, {
          onSuccess: () => onDone({ message: `Deleted the label “${label.name}”.` }),
        })
      }
    >
      <div className={styles.dialogBody}>
        <p>
          {count ? `It comes off ${itemCount(count)}. ` : 'No items use it. '}
          The items themselves don’t change.
        </p>
        <MutationError error={remove.error} title="Couldn’t delete the label" />
      </div>
    </Modal>
  );
}

function selectedItems(workspace: Workspace, keys: string[]) {
  return workspace.items.filter((item) => keys.includes(item.key));
}

function MoveItemsDialog({ workspace, keys, onClose, onDone }: DialogProps & { keys: string[] }) {
  const update = useUpdateItems();
  const items = selectedItems(workspace, keys);
  const current = new Set(items.map((i) => i.folderId ?? NOT_IN_A_FOLDER));
  const [target, setTarget] = useState(
    current.size === 1 ? ([...current][0] ?? NOT_IN_A_FOLDER) : NOT_IN_A_FOLDER,
  );
  const options = folderOptions(workspace.folders);
  const subject = items.length === 1 ? `“${items[0]?.title}”` : itemCount(items.length);

  const submit = () => {
    const folderId = target === NOT_IN_A_FOLDER ? null : target;
    update.mutate(
      { keys, folderId },
      {
        onSuccess: () =>
          onDone({
            message: `Moved ${subject} to ${folderId ? `“${folderPathLabel(workspace.folders, folderId)}”` : 'Not in a folder'}.`,
            undo: restorePatches(
              items,
              (item) => item.folderId,
              (previous) => ({ folderId: previous }),
            ),
          }),
      },
    );
  };

  return (
    <Modal
      open
      size="sm"
      modalHeading={`Move ${subject}`}
      primaryButtonText="Move"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={update.isPending}
      selectorPrimaryFocus="#item-destination"
      onRequestClose={onClose}
      onRequestSubmit={submit}
    >
      <div className={styles.dialogBody}>
        {options.length === 0 ? (
          <p>You don’t have any folders yet. Create one from the Folders list first.</p>
        ) : null}
        <Select
          id="item-destination"
          labelText="Move to"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          <SelectItem value={NOT_IN_A_FOLDER} text="Not in a folder" />
          {options.map(({ folder }) => (
            <SelectItem
              key={folder.id}
              value={folder.id}
              text={folderPathLabel(workspace.folders, folder.id)}
            />
          ))}
        </Select>
        <MutationError error={update.error} title="Couldn’t move" />
      </div>
    </Modal>
  );
}

type LabelChoice = 'on' | 'off' | 'mixed';

function LabelItemsDialog({ workspace, keys, onClose, onDone }: DialogProps & { keys: string[] }) {
  const update = useUpdateItems();
  const items = selectedItems(workspace, keys);
  const initial = Object.fromEntries(
    workspace.labels.map((label) => {
      const n = items.filter((i) => i.labelIds.includes(label.id)).length;
      return [label.id, n === 0 ? 'off' : n === items.length ? 'on' : 'mixed'];
    }),
  ) as Record<string, LabelChoice>;
  const [choices, setChoices] = useState(initial);
  const subject = items.length === 1 ? `“${items[0]?.title}”` : itemCount(items.length);
  const changed = workspace.labels.some((l) => choices[l.id] !== initial[l.id]);

  const submit = () => {
    const addLabelIds = workspace.labels.filter((l) => choices[l.id] === 'on').map((l) => l.id);
    const removeLabelIds = workspace.labels.filter((l) => choices[l.id] === 'off').map((l) => l.id);
    update.mutate(
      { keys, addLabelIds, removeLabelIds },
      {
        onSuccess: () =>
          onDone({
            message: `Updated labels on ${subject}.`,
            undo: restorePatches(
              items,
              (item) => item.labelIds,
              (labelIds) => ({
                addLabelIds: labelIds,
                removeLabelIds: workspace.labels
                  .map((l) => l.id)
                  .filter((id) => !labelIds.includes(id)),
              }),
            ),
          }),
      },
    );
  };

  return (
    <Modal
      open
      size="sm"
      modalHeading={`Labels for ${subject}`}
      primaryButtonText="Save labels"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={update.isPending || !changed}
      onRequestClose={onClose}
      onRequestSubmit={submit}
    >
      <div className={styles.dialogBody}>
        {workspace.labels.length === 0 ? (
          <p>You don’t have any labels yet. Create one from the Labels list first.</p>
        ) : (
          <fieldset className={styles.labelChoices}>
            <legend className={styles.legend}>
              {items.length > 1
                ? 'A dash means some of the selected items have it.'
                : 'Choose labels'}
            </legend>
            {workspace.labels.map((label) => (
              <div key={label.id} className={styles.labelChoice}>
                <Checkbox
                  id={`label-choice-${label.id}`}
                  labelText={label.name}
                  checked={choices[label.id] === 'on'}
                  indeterminate={choices[label.id] === 'mixed'}
                  onChange={(_, { checked }) =>
                    setChoices((prev) => ({ ...prev, [label.id]: checked ? 'on' : 'off' }))
                  }
                />
                <span className={styles.swatch} data-color={label.color} aria-hidden="true" />
              </div>
            ))}
          </fieldset>
        )}
        <MutationError error={update.error} title="Couldn’t save labels" />
      </div>
    </Modal>
  );
}

const renameSchema = z.object({ title: itemTitleSchema });

function RenameItemDialog({ item, onClose, onDone }: DialogProps & { item: WorkspaceItem }) {
  const update = useUpdateItems();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ title: string }>({
    resolver: zodResolver(renameSchema),
    defaultValues: { title: item.title },
  });
  const isRenamed = item.title !== item.originalTitle;
  const undo = [{ keys: [item.key], title: isRenamed ? item.title : null }];

  const save = (title: string | null) =>
    update.mutate(
      { keys: [item.key], title },
      {
        onSuccess: () =>
          onDone({
            message: title ? `Renamed to “${title}”.` : `Back to “${item.originalTitle}”.`,
            undo,
          }),
      },
    );

  const submit = handleSubmit(({ title }) => {
    const trimmed = title.trim();
    save(trimmed === item.originalTitle ? null : trimmed);
  });

  return (
    <Modal
      open
      size="sm"
      modalHeading="Rename"
      primaryButtonText="Save name"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={update.isPending}
      shouldSubmitOnEnter
      selectorPrimaryFocus="#item-title"
      onRequestClose={onClose}
      onRequestSubmit={() => void submit()}
    >
      <div className={styles.dialogBody}>
        <TextInput
          id="item-title"
          labelText="Name"
          helperText={`Only you see this name. Original: ${item.originalTitle}`}
          maxCount={120}
          enableCounter
          invalid={Boolean(errors.title)}
          invalidText={errors.title?.message}
          {...register('title')}
        />
        {isRenamed ? (
          <div>
            <Button kind="ghost" size="sm" disabled={update.isPending} onClick={() => save(null)}>
              Use the original name
            </Button>
          </div>
        ) : null}
        <MutationError error={update.error} title="Couldn’t rename" />
      </div>
    </Modal>
  );
}
