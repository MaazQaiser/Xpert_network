import { z } from 'zod';

export const WORKSPACE_ITEM_TYPES = ['brief', 'report', 'request'] as const;
export const workspaceItemTypeSchema = z.enum(WORKSPACE_ITEM_TYPES);
export type WorkspaceItemType = z.infer<typeof workspaceItemTypeSchema>;

export const ITEM_TYPE_LABELS: Record<WorkspaceItemType, string> = {
  brief: 'Research brief',
  report: 'Report',
  request: 'Custom request',
};

/** Carbon Tag colours offered for labels; each name says the colour so it isn't the only cue. */
export const LABEL_COLORS = [
  'blue',
  'teal',
  'green',
  'purple',
  'magenta',
  'red',
  'cyan',
  'warm-gray',
] as const;
export const labelColorSchema = z.enum(LABEL_COLORS);
export type LabelColor = z.infer<typeof labelColorSchema>;

export const LABEL_COLOR_NAMES: Record<LabelColor, string> = {
  blue: 'Blue',
  teal: 'Teal',
  green: 'Green',
  purple: 'Purple',
  magenta: 'Magenta',
  red: 'Red',
  cyan: 'Cyan',
  'warm-gray': 'Grey',
};

/** Folders nest two levels deep: a top-level folder and its subfolders. */
export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string(),
});
export type Folder = z.infer<typeof folderSchema>;

export const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: labelColorSchema,
});
export type Label = z.infer<typeof labelSchema>;

/** A brief, report or request as it sits in the workspace, with the client's own organisation. */
export const workspaceItemSchema = z.object({
  /** `<type>:<sourceId>` — stable across renames. */
  key: z.string(),
  type: workspaceItemTypeSchema,
  sourceId: z.string(),
  title: z.string(),
  /** The title before the client renamed it, so a rename can be undone. */
  originalTitle: z.string(),
  /** One line of status, e.g. “Quote ready” or “Custom research · 4 experts”. */
  meta: z.string(),
  href: z.string(),
  updatedAt: z.string(),
  folderId: z.string().nullable(),
  labelIds: z.array(z.string()),
  pinned: z.boolean(),
  archived: z.boolean(),
});
export type WorkspaceItem = z.infer<typeof workspaceItemSchema>;

export const workspaceSchema = z.object({
  folders: z.array(folderSchema),
  labels: z.array(labelSchema),
  items: z.array(workspaceItemSchema),
});
export type Workspace = z.infer<typeof workspaceSchema>;

const folderName = z
  .string()
  .trim()
  .min(1, 'Name the folder.')
  .max(60, 'Keep folder names to 60 characters.');

export const folderInputSchema = z.object({
  name: folderName,
  parentId: z.string().nullable(),
});
export type FolderInput = z.infer<typeof folderInputSchema>;

export const folderPatchSchema = z.object({
  name: folderName.optional(),
  parentId: z.string().nullable().optional(),
});
export type FolderPatch = z.infer<typeof folderPatchSchema>;

export const labelInputSchema = z.object({
  name: z.string().trim().min(1, 'Name the label.').max(30, 'Keep labels to 30 characters.'),
  color: labelColorSchema,
});
export type LabelInput = z.infer<typeof labelInputSchema>;

export const itemTitleSchema = z
  .string()
  .trim()
  .min(1, 'Give it a name.')
  .max(120, 'Keep names to 120 characters.');

export const itemsPatchSchema = z.object({
  keys: z.array(z.string()).min(1, 'Select at least one item.'),
  folderId: z.string().nullable().optional(),
  addLabelIds: z.array(z.string()).optional(),
  removeLabelIds: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  /** `null` goes back to the original title. */
  title: itemTitleSchema.nullable().optional(),
});
export type ItemsPatch = z.infer<typeof itemsPatchSchema>;

/** What the main list shows: a smart view or a folder id. */
export const SMART_VIEWS = ['all', 'pinned', 'unfiled', 'archived'] as const;
export type SmartView = (typeof SMART_VIEWS)[number];
export type WorkspaceView = SmartView | { folderId: string };

export const SMART_VIEW_LABELS: Record<SmartView, string> = {
  all: 'All items',
  pinned: 'Pinned',
  unfiled: 'Not in a folder',
  archived: 'Archived',
};

export function parseView(value: string | null, folders: Folder[]): WorkspaceView {
  if (value && (SMART_VIEWS as readonly string[]).includes(value)) return value as SmartView;
  if (value && folders.some((f) => f.id === value)) return { folderId: value };
  return 'all';
}

export function viewKey(view: WorkspaceView): string {
  return typeof view === 'string' ? view : view.folderId;
}

export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The folder and its ancestors, top-level first. */
export function folderPath(folders: Folder[], folderId: string | null): Folder[] {
  const path: Folder[] = [];
  let current = folders.find((f) => f.id === folderId);
  while (current) {
    path.unshift(current);
    const parentId: string | null = current.parentId;
    current = folders.find((f) => f.id === parentId);
  }
  return path;
}

export function folderPathLabel(folders: Folder[], folderId: string | null): string {
  const path = folderPath(folders, folderId);
  return path.length ? path.map((f) => f.name).join(' / ') : SMART_VIEW_LABELS.unfiled;
}

/** Where a folder may go: top level, or under another top-level folder if it has no subfolders. */
export function folderDestinations(folders: Folder[], folderId: string): (Folder | null)[] {
  const hasChildren = folders.some((f) => f.parentId === folderId);
  const parents = hasChildren ? [] : childFolders(folders, null).filter((f) => f.id !== folderId);
  return [null, ...parents];
}

/** Destinations for items, in tree order: each top-level folder followed by its subfolders. */
export function folderOptions(folders: Folder[]): { folder: Folder; depth: 0 | 1 }[] {
  return childFolders(folders, null).flatMap((top) => [
    { folder: top, depth: 0 as const },
    ...childFolders(folders, top.id).map((child) => ({ folder: child, depth: 1 as const })),
  ]);
}

export function itemsInView(items: WorkspaceItem[], view: WorkspaceView, folders: Folder[]) {
  if (view === 'archived') return items.filter((i) => i.archived);
  const live = items.filter((i) => !i.archived);
  if (view === 'all') return live;
  if (view === 'pinned') return live.filter((i) => i.pinned);
  if (view === 'unfiled') return live.filter((i) => i.folderId === null);
  // A folder shows its own items and its subfolders' items.
  const ids = new Set([view.folderId, ...childFolders(folders, view.folderId).map((f) => f.id)]);
  return live.filter((i) => i.folderId !== null && ids.has(i.folderId));
}

export type WorkspaceFilters = {
  q: string;
  type: WorkspaceItemType | null;
  labelIds: string[];
};

export function hasFilters(filters: WorkspaceFilters): boolean {
  return Boolean(filters.q.trim() || filters.type || filters.labelIds.length);
}

/** Text search over title, status line and label names; labels must all match. */
export function matchesFilters(item: WorkspaceItem, filters: WorkspaceFilters, labels: Label[]) {
  if (filters.type && item.type !== filters.type) return false;
  if (!filters.labelIds.every((id) => item.labelIds.includes(id))) return false;
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const labelNames = labels.filter((l) => item.labelIds.includes(l.id)).map((l) => l.name);
  return [item.title, item.originalTitle, item.meta, ...labelNames].some((text) =>
    text.toLowerCase().includes(q),
  );
}

/** Pinned first, then most recently updated. */
export function sortItems(items: WorkspaceItem[]): WorkspaceItem[] {
  return [...items].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );
}
