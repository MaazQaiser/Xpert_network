'use client';

import {
  IconButton,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  SelectItemGroup,
  TreeNode,
  TreeView,
} from '@carbon/react';
import { Archive, Catalog, Folder, FolderAdd, FolderOff, Pin, TagEdit } from '@carbon/icons-react';
import {
  childFolders,
  itemsInView,
  SMART_VIEW_LABELS,
  type Label,
  type SmartView,
  type Workspace,
  type WorkspaceView,
} from '../../model/workspace.schema';
import type { WorkspaceDialog } from './dialogs';
import styles from './WorkspaceBrowser.module.scss';

type FolderNavProps = {
  workspace: Workspace;
  selectedKey: string;
  activeLabelIds: string[];
  onView: (key: string) => void;
  onToggleLabel: (labelId: string) => void;
  onDialog: (dialog: WorkspaceDialog) => void;
};

const SMART_ICONS = { all: Catalog, pinned: Pin, unfiled: FolderOff, archived: Archive } as const;

function NodeLabel({ name, count }: { name: string; count: number }) {
  return (
    <span className={styles.nodeLabel}>
      <span className={styles.nodeName} title={name}>
        {name}
      </span>
      <span className={styles.nodeCount}>{count}</span>
    </span>
  );
}

/** Folders as a tree on wide screens and a select on narrow ones, then the label list. */
export function FolderNav({
  workspace,
  selectedKey,
  activeLabelIds,
  onView,
  onToggleLabel,
  onDialog,
}: FolderNavProps) {
  const { folders, items, labels } = workspace;
  const count = (view: WorkspaceView) => itemsInView(items, view, folders).length;
  const tops = childFolders(folders, null);
  const smart = (view: SmartView) => (
    <TreeNode
      key={view}
      id={view}
      value={view}
      renderIcon={SMART_ICONS[view]}
      label={<NodeLabel name={SMART_VIEW_LABELS[view]} count={count(view)} />}
    />
  );

  return (
    <aside className={styles.nav} aria-label="Folders and labels">
      <div className={styles.navSection}>
        <div className={styles.navHeader}>
          <h2 className={styles.navTitle}>Folders</h2>
          <IconButton
            kind="ghost"
            size="sm"
            label="New folder"
            align="left"
            onClick={() => onDialog({ kind: 'new-folder', parentId: null })}
          >
            <FolderAdd />
          </IconButton>
        </div>

        <TreeView
          className={styles.tree}
          label="Folders"
          hideLabel
          selected={[selectedKey]}
          active={selectedKey}
          onSelect={(selected?: (string | number)[]) => {
            const next = selected?.[0];
            if (next !== undefined && String(next) !== selectedKey) onView(String(next));
          }}
        >
          {smart('all')}
          {smart('pinned')}
          {tops.map((top) => {
            const children = childFolders(folders, top.id);
            return (
              <TreeNode
                key={top.id}
                id={top.id}
                value={top.id}
                renderIcon={Folder}
                defaultIsExpanded
                label={<NodeLabel name={top.name} count={count({ folderId: top.id })} />}
              >
                {children.length
                  ? children.map((child) => (
                      <TreeNode
                        key={child.id}
                        id={child.id}
                        value={child.id}
                        renderIcon={Folder}
                        label={
                          <NodeLabel name={child.name} count={count({ folderId: child.id })} />
                        }
                      />
                    ))
                  : undefined}
              </TreeNode>
            );
          })}
          {smart('unfiled')}
          {smart('archived')}
        </TreeView>

        <Select
          id="workspace-view"
          className={styles.viewSelect}
          labelText="Show"
          value={selectedKey}
          onChange={(event) => onView(event.target.value)}
        >
          <SelectItem value="all" text={`${SMART_VIEW_LABELS.all} (${count('all')})`} />
          <SelectItem value="pinned" text={`${SMART_VIEW_LABELS.pinned} (${count('pinned')})`} />
          {tops.length ? (
            <SelectItemGroup label="Folders">
              {tops.flatMap((top) => [
                <SelectItem
                  key={top.id}
                  value={top.id}
                  text={`${top.name} (${count({ folderId: top.id })})`}
                />,
                ...childFolders(folders, top.id).map((child) => (
                  <SelectItem
                    key={child.id}
                    value={child.id}
                    text={`${top.name} / ${child.name} (${count({ folderId: child.id })})`}
                  />
                )),
              ])}
            </SelectItemGroup>
          ) : null}
          <SelectItem value="unfiled" text={`${SMART_VIEW_LABELS.unfiled} (${count('unfiled')})`} />
          <SelectItem
            value="archived"
            text={`${SMART_VIEW_LABELS.archived} (${count('archived')})`}
          />
        </Select>
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>
          <h2 className={styles.navTitle}>Labels</h2>
          <IconButton
            kind="ghost"
            size="sm"
            label="New label"
            align="left"
            onClick={() => onDialog({ kind: 'new-label' })}
          >
            <TagEdit />
          </IconButton>
        </div>
        {labels.length === 0 ? (
          <p className={styles.navHelp}>Labels work across folders, for example “For the board”.</p>
        ) : (
          <ul className={styles.labelList} aria-label="Filter by label">
            {labels.map((label) => (
              <LabelRow
                key={label.id}
                label={label}
                count={items.filter((i) => !i.archived && i.labelIds.includes(label.id)).length}
                isActive={activeLabelIds.includes(label.id)}
                onToggle={() => onToggleLabel(label.id)}
                onDialog={onDialog}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function LabelRow({
  label,
  count,
  isActive,
  onToggle,
  onDialog,
}: {
  label: Label;
  count: number;
  isActive: boolean;
  onToggle: () => void;
  onDialog: (dialog: WorkspaceDialog) => void;
}) {
  return (
    <li className={styles.labelRow}>
      <button
        type="button"
        className={styles.labelFilter}
        aria-pressed={isActive}
        onClick={onToggle}
      >
        <span className={styles.swatch} data-color={label.color} aria-hidden="true" />
        <span className={styles.nodeName}>{label.name}</span>
        <span className={styles.nodeCount}>{count}</span>
      </button>
      <OverflowMenu iconDescription={`Actions for label ${label.name}`} size="sm" flipped>
        <OverflowMenuItem
          itemText="Edit label"
          onClick={() => onDialog({ kind: 'edit-label', label })}
        />
        <OverflowMenuItem
          itemText="Delete label"
          isDelete
          hasDivider
          onClick={() => onDialog({ kind: 'delete-label', label })}
        />
      </OverflowMenu>
    </li>
  );
}
