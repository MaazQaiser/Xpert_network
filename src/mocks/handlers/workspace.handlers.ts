import { http, HttpResponse } from 'msw';
import { STATUS_LABELS } from '@/features/custom-requests';
import {
  folderInputSchema,
  folderPatchSchema,
  itemsPatchSchema,
  labelInputSchema,
  type Workspace,
  type WorkspaceItem,
} from '@/features/workspace';
import { createId } from '@/shared/lib/id';
import { getControls } from '../controls';
import { LIBRARY_ITEMS } from '../fixtures/library';
import { EMPTY_META, type ItemMeta, type StoredWorkspace } from '../fixtures/workspace';
import { db, type DemoState } from '../store/db';
import { currentUser, errorResponse, injectedError, simulateNetwork, unauthorized } from './utils';

const BRIEF_STATUS = {
  draft: 'Draft brief',
  confirmed: 'Needs confirmed',
  submitted: 'Submitted',
} as const;

type Source = Omit<WorkspaceItem, 'folderId' | 'labelIds' | 'pinned' | 'archived' | 'title'> & {
  defaultTitle: string;
};

/** Everything the client owns, before their own folders and labels are applied. */
function sourcesFor(state: DemoState, userId: string): Source[] {
  const briefs: Source[] = Object.values(state.briefs)
    .filter((brief) => brief.ownerId === userId)
    .map((brief) => ({
      key: `brief:${brief.id}`,
      type: 'brief',
      sourceId: brief.id,
      defaultTitle: brief.title,
      originalTitle: brief.title,
      meta: BRIEF_STATUS[brief.status],
      href: `/ask/${brief.id}`,
      updatedAt: brief.updatedAt,
    }));

  const purchases = state.reportPurchases[userId] ?? {};
  const reports: Source[] = [...new Set(state.ownedReports[userId] ?? [])].flatMap((id) => {
    const custom = state.customReports[id];
    const item = custom?.ownerId === userId ? custom.item : LIBRARY_ITEMS.find((i) => i.id === id);
    if (!item) return [];
    return [
      {
        key: `report:${id}`,
        type: 'report' as const,
        sourceId: id,
        defaultTitle: item.title,
        originalTitle: item.title,
        meta: custom
          ? `Custom research · ${item.expertCount} experts`
          : `${item.category.industry} · ${item.expertCount} experts`,
        href: `/library/${id}/read`,
        updatedAt: purchases[id] ?? item.publishedAt,
      },
    ];
  });

  const requests: Source[] = Object.values(state.requests)
    .filter((request) => request.ownerId === userId)
    .map((request) => ({
      key: `request:${request.id}`,
      type: 'request',
      sourceId: request.id,
      defaultTitle: request.title,
      originalTitle: request.title,
      meta: STATUS_LABELS[request.status],
      href: `/requests/${request.id}`,
      updatedAt: request.timeline?.at(-1)?.at ?? request.createdAt,
    }));

  return [...briefs, ...reports, ...requests];
}

function storedFor(state: DemoState, userId: string): StoredWorkspace {
  return state.workspaces[userId] ?? { folders: [], labels: [], items: {} };
}

export function workspaceFor(userId: string): Workspace {
  if (getControls().emptyData) return { folders: [], labels: [], items: [] };
  const state = db.get();
  const stored = storedFor(state, userId);
  const folderIds = new Set(stored.folders.map((f) => f.id));
  const labelIds = new Set(stored.labels.map((l) => l.id));
  const items = sourcesFor(state, userId).map(({ defaultTitle, ...source }) => {
    const meta = stored.items[source.key] ?? EMPTY_META;
    return {
      ...source,
      title: meta.title ?? defaultTitle,
      folderId: meta.folderId && folderIds.has(meta.folderId) ? meta.folderId : null,
      labelIds: meta.labelIds.filter((id) => labelIds.has(id)),
      pinned: meta.pinned,
      archived: meta.archived,
    };
  });
  return { folders: stored.folders, labels: stored.labels, items };
}

/** Runs a change against the signed-in client's workspace and answers with the new workspace. */
async function mutate(
  change: (workspace: StoredWorkspace, userId: string) => Response | undefined,
): Promise<Response> {
  await simulateNetwork();
  const user = currentUser();
  if (!user) return unauthorized();
  const failure = injectedError();
  if (failure) return failure;
  let problem: Response | undefined;
  db.update((draft) => {
    const workspace = structuredClone(storedFor(draft, user.id));
    problem = change(workspace, user.id);
    if (!problem) draft.workspaces[user.id] = workspace;
  });
  return problem ?? HttpResponse.json(workspaceFor(user.id));
}

function invalid(message: string) {
  return errorResponse(422, 'invalid', message);
}

function nameTaken(
  workspace: StoredWorkspace,
  name: string,
  parentId: string | null,
  exceptId?: string,
) {
  return workspace.folders.some(
    (f) =>
      f.id !== exceptId && f.parentId === parentId && f.name.toLowerCase() === name.toLowerCase(),
  );
}

function checkParent(workspace: StoredWorkspace, parentId: string | null, folderId?: string) {
  if (parentId === null) return null;
  const parent = workspace.folders.find((f) => f.id === parentId);
  if (!parent || parent.id === folderId) return invalid('Choose a folder that exists.');
  if (parent.parentId !== null)
    return invalid('Folders go two levels deep. Choose a top-level folder.');
  if (folderId && workspace.folders.some((f) => f.parentId === folderId)) {
    return invalid('This folder has subfolders, so it stays at the top level.');
  }
  return null;
}

export const workspaceHandlers = [
  http.get('/api/workspace', async () => {
    await simulateNetwork();
    const user = currentUser();
    if (!user) return unauthorized();
    return injectedError() ?? HttpResponse.json(workspaceFor(user.id));
  }),

  http.post('/api/workspace/folders', async ({ request }) => {
    const parsed = folderInputSchema.safeParse(await request.json());
    return mutate((workspace) => {
      if (!parsed.success)
        return invalid(parsed.error.issues[0]?.message ?? 'Check the folder name.');
      const { name, parentId } = parsed.data;
      const parentProblem = checkParent(workspace, parentId);
      if (parentProblem) return parentProblem;
      if (nameTaken(workspace, name, parentId)) {
        return errorResponse(
          409,
          'folder_exists',
          `There’s already a folder called “${name}” here.`,
        );
      }
      workspace.folders.push({
        id: createId('fld'),
        name,
        parentId,
        createdAt: new Date().toISOString(),
      });
    });
  }),

  http.patch('/api/workspace/folders/:folderId', async ({ params, request }) => {
    const parsed = folderPatchSchema.safeParse(await request.json());
    return mutate((workspace) => {
      if (!parsed.success)
        return invalid(parsed.error.issues[0]?.message ?? 'Check the folder name.');
      const folder = workspace.folders.find((f) => f.id === params.folderId);
      if (!folder) return errorResponse(404, 'not_found', 'This folder no longer exists.');
      const parentId = parsed.data.parentId === undefined ? folder.parentId : parsed.data.parentId;
      const name = parsed.data.name ?? folder.name;
      if (parentId !== folder.parentId) {
        const parentProblem = checkParent(workspace, parentId, folder.id);
        if (parentProblem) return parentProblem;
      }
      if (nameTaken(workspace, name, parentId, folder.id)) {
        return errorResponse(
          409,
          'folder_exists',
          `There’s already a folder called “${name}” there.`,
        );
      }
      folder.name = name;
      folder.parentId = parentId;
    });
  }),

  // Deleting a folder never deletes research: its items go back to “Not in a folder”.
  http.delete('/api/workspace/folders/:folderId', async ({ params }) =>
    mutate((workspace) => {
      const ids = new Set(
        workspace.folders
          .filter((f) => f.id === params.folderId || f.parentId === params.folderId)
          .map((f) => f.id),
      );
      if (!ids.size) return errorResponse(404, 'not_found', 'This folder no longer exists.');
      workspace.folders = workspace.folders.filter((f) => !ids.has(f.id));
      for (const meta of Object.values(workspace.items)) {
        if (meta.folderId && ids.has(meta.folderId)) meta.folderId = null;
      }
    }),
  ),

  http.post('/api/workspace/labels', async ({ request }) => {
    const parsed = labelInputSchema.safeParse(await request.json());
    return mutate((workspace) => {
      if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the label.');
      const { name, color } = parsed.data;
      if (workspace.labels.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
        return errorResponse(409, 'label_exists', `You already have a label called “${name}”.`);
      }
      workspace.labels.push({ id: createId('lbl'), name, color });
    });
  }),

  http.patch('/api/workspace/labels/:labelId', async ({ params, request }) => {
    const parsed = labelInputSchema.safeParse(await request.json());
    return mutate((workspace) => {
      if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check the label.');
      const label = workspace.labels.find((l) => l.id === params.labelId);
      if (!label) return errorResponse(404, 'not_found', 'This label no longer exists.');
      const { name, color } = parsed.data;
      if (
        workspace.labels.some(
          (l) => l.id !== label.id && l.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        return errorResponse(409, 'label_exists', `You already have a label called “${name}”.`);
      }
      label.name = name;
      label.color = color;
    });
  }),

  http.delete('/api/workspace/labels/:labelId', async ({ params }) =>
    mutate((workspace) => {
      workspace.labels = workspace.labels.filter((l) => l.id !== params.labelId);
      for (const meta of Object.values(workspace.items)) {
        meta.labelIds = meta.labelIds.filter((id) => id !== params.labelId);
      }
      return undefined;
    }),
  ),

  http.patch('/api/workspace/items', async ({ request }) => {
    const parsed = itemsPatchSchema.safeParse(await request.json());
    return mutate((workspace, userId) => {
      if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? 'Check your changes.');
      const patch = parsed.data;
      const owned = new Set(sourcesFor(db.get(), userId).map((s) => s.key));
      if (patch.keys.some((key) => !owned.has(key))) {
        return errorResponse(
          404,
          'not_found',
          'One of these items is no longer in your workspace.',
        );
      }
      if (patch.folderId && !workspace.folders.some((f) => f.id === patch.folderId)) {
        return invalid('Choose a folder that exists.');
      }
      for (const key of patch.keys) {
        const meta: ItemMeta = workspace.items[key] ?? { ...EMPTY_META, labelIds: [] };
        if (patch.folderId !== undefined) meta.folderId = patch.folderId;
        if (patch.pinned !== undefined) meta.pinned = patch.pinned;
        if (patch.archived !== undefined) {
          meta.archived = patch.archived;
          if (patch.archived) meta.pinned = false;
        }
        if (patch.title !== undefined) meta.title = patch.title;
        const labels = new Set([...meta.labelIds, ...(patch.addLabelIds ?? [])]);
        for (const id of patch.removeLabelIds ?? []) labels.delete(id);
        meta.labelIds = [...labels];
        workspace.items[key] = meta;
      }
    });
  }),
];
