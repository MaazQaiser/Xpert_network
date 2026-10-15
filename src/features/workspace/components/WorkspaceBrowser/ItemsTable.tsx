'use client';

import Link from 'next/link';
import {
  DataTable,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  Tag,
} from '@carbon/react';
import {
  Archive,
  Chat,
  DocumentView,
  FolderMoveTo,
  PinFilled,
  Task,
  TagEdit,
  Undo,
} from '@carbon/icons-react';
import { useBreakpointUp, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { formatDate, formatDateTime } from '@/shared/lib/dates';
import {
  folderPathLabel,
  ITEM_TYPE_LABELS,
  type Workspace,
  type WorkspaceItem,
} from '../../model/workspace.schema';
import styles from './WorkspaceBrowser.module.scss';

export type ItemAction = 'move' | 'labels' | 'rename' | 'pin' | 'unpin' | 'archive' | 'restore';

type ItemsTableProps = {
  items: WorkspaceItem[];
  workspace: Workspace;
  /** The heading the table is named after. */
  labelledBy: string;
  isArchiveView: boolean;
  /** `clearSelection` is called once the action has gone through. */
  onAction: (action: ItemAction, items: WorkspaceItem[], clearSelection: () => void) => void;
};

const HEADERS = [
  { key: 'title', header: 'Name' },
  { key: 'type', header: 'Type' },
  { key: 'location', header: 'Folder' },
  { key: 'updatedAt', header: 'Updated' },
];

/** Narrow screens keep the name column (with its status and labels); the rest hide. */
const COLUMN_CLASS: Record<string, string | undefined> = {
  title: styles.nameColumn,
  type: styles.fromMd,
  location: styles.fromLg,
  updatedAt: styles.fromMd,
};

const TYPE_ICONS = { brief: Chat, report: DocumentView, request: Task } as const;

export function ItemsTable({
  items,
  workspace,
  labelledBy,
  isArchiveView,
  onAction,
}: ItemsTableProps) {
  // Phones get icon-only bulk actions so Archive and Cancel stay on screen.
  const isCompact = !useBreakpointUp('md');
  // Below 360px even icons don't fit; labels stay in each row's menu.
  const hasRoomForLabels = useMediaQuery('(min-width: 360px)', true);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const rows = items.map((item) => ({
    id: item.key,
    title: item.title,
    type: ITEM_TYPE_LABELS[item.type],
    location: folderPathLabel(workspace.folders, item.folderId),
    updatedAt: item.updatedAt,
  }));

  return (
    <DataTable rows={rows} headers={HEADERS}>
      {({
        rows: tableRows,
        headers,
        selectedRows,
        getHeaderProps,
        getRowProps,
        getSelectionProps,
        getBatchActionProps,
        getTableProps,
        getTableContainerProps,
        getToolbarProps,
      }) => {
        const batch = getBatchActionProps();
        const selected = selectedRows.flatMap((row) => byKey.get(row.id) ?? []);
        const tabIndex = batch.shouldShowBatchActions ? 0 : -1;
        const run = (action: ItemAction) => onAction(action, selected, batch.onCancel);

        return (
          <TableContainer {...getTableContainerProps()} className={styles.table}>
            <TableToolbar {...getToolbarProps()} aria-label="Bulk actions">
              <TableBatchActions
                {...batch}
                translateWithId={(id, args) =>
                  id === 'carbon.table.batch.cancel'
                    ? 'Cancel'
                    : `${args?.totalSelected ?? 0} selected`
                }
              >
                {isArchiveView ? (
                  <TableBatchAction
                    tabIndex={tabIndex}
                    renderIcon={Undo}
                    hasIconOnly={isCompact}
                    iconDescription="Restore"
                    onClick={() => run('restore')}
                  >
                    Restore
                  </TableBatchAction>
                ) : (
                  <>
                    <TableBatchAction
                      tabIndex={tabIndex}
                      renderIcon={FolderMoveTo}
                      hasIconOnly={isCompact}
                      iconDescription="Move to folder"
                      onClick={() => run('move')}
                    >
                      Move to folder
                    </TableBatchAction>
                    {hasRoomForLabels ? (
                      <TableBatchAction
                        tabIndex={tabIndex}
                        renderIcon={TagEdit}
                        hasIconOnly={isCompact}
                        iconDescription="Labels"
                        onClick={() => run('labels')}
                      >
                        Labels
                      </TableBatchAction>
                    ) : null}
                    <TableBatchAction
                      tabIndex={tabIndex}
                      renderIcon={Archive}
                      hasIconOnly={isCompact}
                      iconDescription="Archive"
                      onClick={() => run('archive')}
                    >
                      Archive
                    </TableBatchAction>
                  </>
                )}
              </TableBatchActions>
              <TableToolbarContent aria-hidden={batch.shouldShowBatchActions}>
                <p className={styles.toolbarHint}>
                  {isArchiveView
                    ? 'Select items to restore them.'
                    : 'Select items to move, label or archive them together.'}
                </p>
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} aria-labelledby={labelledBy} size="lg">
              <TableHead>
                <TableRow>
                  <TableSelectAll {...getSelectionProps()} />
                  {headers.map((header) => {
                    const { key, ...headerProps } = getHeaderProps({ header, isSortable: false });
                    return (
                      <TableHeader key={key} {...headerProps} className={COLUMN_CLASS[header.key]}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                  <TableHeader className={styles.menuColumn}>
                    <span className={styles.visuallyHidden}>Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => {
                  const item = byKey.get(row.id);
                  if (!item) return null;
                  const { key, ...rowProps } = getRowProps({ row });
                  const TypeIcon = TYPE_ICONS[item.type];
                  return (
                    <TableRow key={key} {...rowProps}>
                      <TableSelectRow
                        {...getSelectionProps({ row })}
                        aria-label={`Select ${item.title}`}
                      />
                      <TableCell>
                        <div className={styles.nameCell}>
                          <TypeIcon
                            className={styles.typeIcon}
                            aria-label={ITEM_TYPE_LABELS[item.type]}
                          />
                          <div className={styles.nameText}>
                            <span>
                              <Link href={item.href} className={styles.itemLink}>
                                {item.title}
                              </Link>
                              {item.pinned ? (
                                <PinFilled
                                  className={styles.pinIcon}
                                  aria-label="Pinned"
                                  role="img"
                                />
                              ) : null}
                            </span>
                            <span className={styles.itemMeta}>{item.meta}</span>
                            {item.labelIds.length ? (
                              <span className={styles.itemLabels}>
                                {workspace.labels
                                  .filter((label) => item.labelIds.includes(label.id))
                                  .map((label) => (
                                    <Tag key={label.id} type={label.color} size="sm">
                                      {label.name}
                                    </Tag>
                                  ))}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={styles.fromMd}>{ITEM_TYPE_LABELS[item.type]}</TableCell>
                      <TableCell className={styles.fromLg}>
                        {folderPathLabel(workspace.folders, item.folderId)}
                      </TableCell>
                      <TableCell className={styles.fromMd}>
                        <time dateTime={item.updatedAt} title={formatDateTime(item.updatedAt)}>
                          {formatDate(item.updatedAt)}
                        </time>
                      </TableCell>
                      <TableCell className="cds--table-column-menu">
                        <ItemMenu
                          item={item}
                          onAction={(action) => onAction(action, [item], batch.onCancel)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        );
      }}
    </DataTable>
  );
}

function ItemMenu({
  item,
  onAction,
}: {
  item: WorkspaceItem;
  onAction: (action: ItemAction) => void;
}) {
  if (item.archived) {
    return (
      <OverflowMenu iconDescription={`Actions for ${item.title}`} size="sm" flipped>
        <OverflowMenuItem itemText="Restore" onClick={() => onAction('restore')} />
      </OverflowMenu>
    );
  }
  return (
    <OverflowMenu iconDescription={`Actions for ${item.title}`} size="sm" flipped>
      <OverflowMenuItem itemText="Rename" onClick={() => onAction('rename')} />
      <OverflowMenuItem itemText="Move to folder" onClick={() => onAction('move')} />
      <OverflowMenuItem itemText="Labels" onClick={() => onAction('labels')} />
      <OverflowMenuItem
        itemText={item.pinned ? 'Unpin' : 'Pin to top'}
        onClick={() => onAction(item.pinned ? 'unpin' : 'pin')}
      />
      <OverflowMenuItem itemText="Archive" hasDivider onClick={() => onAction('archive')} />
    </OverflowMenu>
  );
}
