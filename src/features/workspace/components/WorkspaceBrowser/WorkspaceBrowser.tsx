'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ActionableNotification,
  Button,
  DataTableSkeleton,
  Dropdown,
  FeatureFlags,
  InlineNotification,
  MultiSelect,
  OverflowMenu,
  OverflowMenuItem,
  Search,
  SkeletonText,
} from '@carbon/react';
import { Folder as FolderPictogram, Magnify } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { AsyncBoundary, EmptyState, PageHeader } from '@/shared/ui';
import { useUpdateItems, useWorkspace } from '../../api/queries';
import {
  folderPath,
  hasFilters,
  ITEM_TYPE_LABELS,
  itemsInView,
  matchesFilters,
  parseView,
  SMART_VIEW_LABELS,
  sortItems,
  viewKey,
  WORKSPACE_ITEM_TYPES,
  workspaceItemTypeSchema,
  type ItemsPatch,
  type Label,
  type Workspace,
  type WorkspaceFilters,
  type WorkspaceItem,
  type WorkspaceItemType,
} from '../../model/workspace.schema';
import { archiveUndo, WorkspaceDialogs, type DialogResult, type WorkspaceDialog } from './dialogs';
import { FolderNav } from './FolderNav';
import { ItemsTable, type ItemAction } from './ItemsTable';
import styles from './WorkspaceBrowser.module.scss';

const ALL_TYPES = 'all';
const HEADING_ID = 'workspace-view-heading';

/** F5 workspace: folders and labels on the side, the chosen view's items in a table. */
export function WorkspaceBrowser() {
  const workspace = useWorkspace();
  return (
    <div className={styles.root}>
      <PageHeader
        title="Workspace"
        subtitle="Your research briefs, reports and custom requests, organised your way."
      />
      <AsyncBoundary
        query={workspace}
        errorTitle="Your workspace didn’t load"
        loading={<WorkspaceSkeleton />}
        isEmpty={(data) => data.items.length === 0 && data.folders.length === 0}
        empty={
          <EmptyState
            pictogram={<FolderPictogram aria-hidden="true" />}
            title="Nothing to organise yet"
            description="Research briefs from the goal chat, reports you buy and custom requests all collect here, ready to sort into folders."
            action={
              <Button as={Link} href="/ask">
                Start a research goal
              </Button>
            }
          />
        }
      >
        {(data) => (
          // useSearchParams needs a Suspense boundary for static rendering.
          <Suspense fallback={<WorkspaceSkeleton />}>
            <Organiser workspace={data} />
          </Suspense>
        )}
      </AsyncBoundary>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading your workspace">
      <div className={styles.nav}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={6} />
      </div>
      <div className={styles.main}>
        <SkeletonText heading width="30%" />
        <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} showToolbar={false} />
      </div>
    </div>
  );
}

function readFilters(params: URLSearchParams, labels: Label[]): WorkspaceFilters {
  const type = workspaceItemTypeSchema.safeParse(params.get('type'));
  const labelIds = (params.get('labels') ?? '')
    .split(',')
    .filter((id) => labels.some((label) => label.id === id));
  return { q: params.get('q') ?? '', type: type.success ? type.data : null, labelIds };
}

type Status = { message: string; undo?: ItemsPatch[] };

function Organiser({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = parseView(params.get('view'), workspace.folders);
  const selectedKey = viewKey(view);
  const filters = readFilters(new URLSearchParams(params.toString()), workspace.labels);
  const [query, setQuery] = useState(filters.q);
  const [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const clearSelection = useRef<() => void>(() => {});
  const updateItems = useUpdateItems();

  const navigate = (next: { view?: string; filters?: Partial<WorkspaceFilters> }) => {
    const merged = { ...filters, ...next.filters };
    const search = new URLSearchParams();
    const nextView = next.view ?? selectedKey;
    if (nextView !== 'all') search.set('view', nextView);
    if (merged.q.trim()) search.set('q', merged.q.trim());
    if (merged.type) search.set('type', merged.type);
    if (merged.labelIds.length) search.set('labels', merged.labelIds.join(','));
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Search as you type, without a history entry per keystroke.
  useEffect(() => {
    if (query === filters.q) return;
    const timer = window.setTimeout(() => navigate({ filters: { q: query } }), 250);
    return () => window.clearTimeout(timer);
    // Only the typed query should restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const folder =
    typeof view === 'string' ? null : workspace.folders.find((f) => f.id === view.folderId);
  const path = folder ? folderPath(workspace.folders, folder.id) : [];
  const title = folder ? folder.name : SMART_VIEW_LABELS[view as keyof typeof SMART_VIEW_LABELS];
  const inView = itemsInView(workspace.items, view, workspace.folders);
  const visible = sortItems(
    inView.filter((item) => matchesFilters(item, filters, workspace.labels)),
  );
  const isFiltered = hasFilters(filters);

  const focusHeading = () =>
    window.requestAnimationFrame(() => document.getElementById(HEADING_ID)?.focus());

  const closeDialog = () => {
    setDialog(null);
    focusHeading();
  };

  const finishDialog = (result: DialogResult) => {
    setDialog(null);
    clearSelection.current();
    setStatus({ message: result.message, ...(result.undo ? { undo: result.undo } : {}) });
    if (result.view) navigate({ view: result.view });
    else if (result.deletedFolderIds?.includes(selectedKey)) navigate({ view: 'all' });
    focusHeading();
  };

  const patchItems = (patch: ItemsPatch, done: Status, clear: () => void) =>
    updateItems.mutate(patch, {
      onSuccess: () => {
        clear();
        setStatus(done);
      },
    });

  const undo = async (patches: ItemsPatch[]) => {
    setStatus(null);
    try {
      for (const patch of patches) await updateItems.mutateAsync(patch);
      setStatus({ message: 'Undone.' });
    } catch {
      // The mutation's error is shown above the table.
    }
  };

  const onAction = (action: ItemAction, items: WorkspaceItem[], clear: () => void) => {
    const keys = items.map((item) => item.key);
    const subject = items.length === 1 ? `“${items[0]?.title}”` : `${items.length} items`;
    clearSelection.current = clear;
    setStatus(null);
    switch (action) {
      case 'move':
        return setDialog({ kind: 'move-items', keys });
      case 'labels':
        return setDialog({ kind: 'label-items', keys });
      case 'rename':
        return items[0] ? setDialog({ kind: 'rename-item', item: items[0] }) : undefined;
      case 'pin':
        return patchItems(
          { keys, pinned: true },
          { message: `Pinned ${subject} to the top.` },
          clear,
        );
      case 'unpin':
        return patchItems({ keys, pinned: false }, { message: `Unpinned ${subject}.` }, clear);
      case 'archive':
        return patchItems(
          { keys, archived: true },
          { message: `Archived ${subject}.`, undo: archiveUndo(items) },
          clear,
        );
      case 'restore':
        return patchItems(
          { keys, archived: false },
          { message: `Restored ${subject}.`, undo: [{ keys, archived: true }] },
          clear,
        );
    }
  };

  const toggleLabel = (labelId: string) =>
    navigate({
      filters: {
        labelIds: filters.labelIds.includes(labelId)
          ? filters.labelIds.filter((id) => id !== labelId)
          : [...filters.labelIds, labelId],
      },
    });

  const clearFilters = () => {
    setQuery('');
    navigate({ filters: { q: '', type: null, labelIds: [] } });
  };

  return (
    <FeatureFlags enableTreeviewControllable enableFocusWrapWithoutSentinels>
      <div className={styles.layout}>
        <FolderNav
          workspace={workspace}
          selectedKey={selectedKey}
          activeLabelIds={filters.labelIds}
          onView={(key) => {
            setStatus(null);
            navigate({ view: key });
          }}
          onToggleLabel={toggleLabel}
          onDialog={(next) => {
            setStatus(null);
            setDialog(next);
          }}
        />

        <section className={styles.main} aria-labelledby={HEADING_ID}>
          <div className={styles.viewHeader}>
            <div className={styles.viewTitleGroup}>
              {path.length > 1 ? <p className={styles.viewPath}>{path[0]?.name} /</p> : null}
              <h2 id={HEADING_ID} className={styles.viewTitle} tabIndex={-1}>
                {title}
              </h2>
              <p className={styles.viewCount}>
                {isFiltered ? `${visible.length} of ${inView.length}` : inView.length}{' '}
                {inView.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            {folder ? (
              <OverflowMenu iconDescription={`Actions for folder ${folder.name}`} size="md" flipped>
                {folder.parentId === null ? (
                  <OverflowMenuItem
                    itemText="New subfolder"
                    onClick={() => setDialog({ kind: 'new-folder', parentId: folder.id })}
                  />
                ) : null}
                <OverflowMenuItem
                  itemText="Rename folder"
                  onClick={() => setDialog({ kind: 'rename-folder', folder })}
                />
                <OverflowMenuItem
                  itemText="Move folder"
                  onClick={() => setDialog({ kind: 'move-folder', folder })}
                />
                <OverflowMenuItem
                  itemText="Delete folder"
                  isDelete
                  hasDivider
                  onClick={() => setDialog({ kind: 'delete-folder', folder })}
                />
              </OverflowMenu>
            ) : null}
          </div>

          <div className={styles.filters} role="search" aria-label="Search and filter this view">
            <Search
              size="md"
              labelText="Search this view"
              placeholder="Search names, statuses and labels"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              closeButtonLabelText="Clear search"
            />
            <Dropdown
              id="workspace-type"
              titleText="Type"
              hideLabel
              label="All types"
              size="md"
              items={[ALL_TYPES, ...WORKSPACE_ITEM_TYPES]}
              itemToString={(item: string | null) =>
                !item || item === ALL_TYPES
                  ? 'All types'
                  : ITEM_TYPE_LABELS[item as WorkspaceItemType]
              }
              selectedItem={filters.type ?? ALL_TYPES}
              onChange={({ selectedItem }: { selectedItem: string | null }) =>
                navigate({
                  filters: {
                    type:
                      selectedItem && selectedItem !== ALL_TYPES
                        ? (selectedItem as WorkspaceItemType)
                        : null,
                  },
                })
              }
            />
            <MultiSelect<Label>
              id="workspace-labels"
              titleText="Labels"
              hideLabel
              label="Any label"
              size="md"
              items={workspace.labels}
              itemToString={(item) => (item ? item.name : '')}
              selectedItems={workspace.labels.filter((label) =>
                filters.labelIds.includes(label.id),
              )}
              onChange={({ selectedItems }) =>
                navigate({ filters: { labelIds: (selectedItems ?? []).map((label) => label.id) } })
              }
              disabled={workspace.labels.length === 0}
            />
            {isFiltered ? (
              <Button kind="ghost" size="md" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>

          <div className={styles.statusRegion}>
            {status ? (
              <ActionableNotification
                inline
                kind="success"
                role="status"
                lowContrast
                hasFocus={false}
                title={status.message}
                className={styles.notice}
                {...(status.undo
                  ? {
                      actionButtonLabel: 'Undo',
                      onActionButtonClick: () => void undo(status.undo ?? []),
                    }
                  : {})}
                onClose={() => {
                  setStatus(null);
                  return true;
                }}
              />
            ) : null}
            {updateItems.isError ? (
              <InlineNotification
                kind="error"
                title="That change didn’t save"
                subtitle={toUserMessage(updateItems.error)}
                lowContrast
                className={styles.notice}
              />
            ) : null}
          </div>

          {visible.length ? (
            <ItemsTable
              items={visible}
              workspace={workspace}
              labelledBy={HEADING_ID}
              isArchiveView={view === 'archived'}
              onAction={onAction}
            />
          ) : (
            <ViewEmptyState
              view={selectedKey}
              isFolder={Boolean(folder)}
              isFiltered={isFiltered}
              query={filters.q}
              onClear={clearFilters}
              onShowAll={() => navigate({ view: 'all' })}
            />
          )}
        </section>
      </div>

      {dialog ? (
        <WorkspaceDialogs
          dialog={dialog}
          workspace={workspace}
          onClose={closeDialog}
          onDone={finishDialog}
        />
      ) : null}
    </FeatureFlags>
  );
}

const VIEW_EMPTY = {
  all: {
    title: 'No research here yet',
    description:
      'Research briefs from the goal chat, reports you buy and custom requests collect here.',
  },
  pinned: {
    title: 'Nothing pinned',
    description:
      'Pin the research you come back to most. Pinned items stay at the top of every list.',
  },
  unfiled: {
    title: 'Everything is in a folder',
    description: 'New briefs, reports and requests appear here until you move them into a folder.',
  },
  archived: {
    title: 'Nothing archived',
    description: 'Archive finished work to tidy your lists. You can restore it at any time.',
  },
  folder: {
    title: 'This folder is empty',
    description: 'Go to All items, select what belongs here and choose Move to folder.',
  },
} satisfies Record<string, { title: string; description: string }>;

function ViewEmptyState({
  view,
  isFolder,
  isFiltered,
  query,
  onClear,
  onShowAll,
}: {
  view: string;
  isFolder: boolean;
  isFiltered: boolean;
  query: string;
  onClear: () => void;
  onShowAll: () => void;
}) {
  if (isFiltered) {
    return (
      <EmptyState
        headingLevel={3}
        pictogram={<Magnify aria-hidden="true" />}
        title={query.trim() ? `No matches for “${query.trim()}”` : 'No items match these filters'}
        description="Try another word, or clear the filters to see everything in this view."
        action={
          <Button kind="tertiary" onClick={onClear}>
            Clear filters
          </Button>
        }
      />
    );
  }
  const key = isFolder ? 'folder' : view;
  const copy = key in VIEW_EMPTY ? VIEW_EMPTY[key as keyof typeof VIEW_EMPTY] : VIEW_EMPTY.all;
  return (
    <EmptyState
      headingLevel={3}
      pictogram={<FolderPictogram aria-hidden="true" />}
      title={copy.title}
      description={copy.description}
      action={
        view === 'all' ? (
          <Button as={Link} href="/ask">
            Start a research goal
          </Button>
        ) : (
          <Button kind="tertiary" onClick={onShowAll}>
            Go to All items
          </Button>
        )
      }
    />
  );
}
