import { describe, expect, it } from 'vitest';
import type { Workspace } from '@/features/workspace';
import { db, setControls } from '@/test/mockBackend';

const logIn = (id: string) =>
  db.update((draft) => {
    draft.sessionUserId = id;
  });

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Workspace & { message?: string },
  };
}

const item = (ws: Workspace, key: string) => ws.items.find((i) => i.key === key);

describe('workspace mock API (F5)', () => {
  it('lists the client’s reports and requests with their organisation', async () => {
    logIn('usr_ayesha');
    const { body } = await call('GET', '/api/workspace');
    expect(body.folders.map((f) => f.name)).toContain('Competitors');
    expect(item(body, 'report:lib_gcc_coffee_2026')).toMatchObject({
      folderId: 'fld_qahwa',
      pinned: true,
      href: '/library/lib_gcc_coffee_2026/read',
    });
    expect(item(body, 'request:req_qahwa_pipeline')?.meta).toBe('Quote ready');
    expect(item(body, 'report:lib_uae_retail')?.folderId).toBeNull();
  });

  it('keeps folders two levels deep and names unique among siblings', async () => {
    logIn('usr_ayesha');
    const tooDeep = await call('POST', '/api/workspace/folders', {
      name: 'Pricing',
      parentId: 'fld_competitors',
    });
    expect(tooDeep.status).toBe(422);
    const duplicate = await call('POST', '/api/workspace/folders', {
      name: 'competitors',
      parentId: 'fld_qahwa',
    });
    expect(duplicate.status).toBe(409);
    const ok = await call('POST', '/api/workspace/folders', {
      name: 'Pricing',
      parentId: 'fld_qahwa',
    });
    expect(ok.status).toBe(200);
    // A folder with subfolders can't go under another folder.
    const move = await call('PATCH', '/api/workspace/folders/fld_qahwa', { parentId: 'fld_board' });
    expect(move.status).toBe(422);
  });

  it('deleting a folder moves its items out instead of deleting them', async () => {
    logIn('usr_ayesha');
    const { body } = await call('DELETE', '/api/workspace/folders/fld_qahwa');
    expect(body.folders.map((f) => f.id)).not.toContain('fld_competitors');
    expect(item(body, 'report:lib_gcc_coffee_2026')?.folderId).toBeNull();
    expect(item(body, 'request:req_qahwa_pipeline')?.folderId).toBeNull();
  });

  it('moves, labels, archives and renames items in bulk', async () => {
    logIn('usr_ayesha');
    const keys = ['report:lib_uae_retail', 'request:req_qahwa_pipeline'];
    let { body } = await call('PATCH', '/api/workspace/items', {
      keys,
      folderId: 'fld_board',
      addLabelIds: ['lbl_cfo'],
      removeLabelIds: ['lbl_follow_up'],
    });
    expect(keys.map((k) => item(body, k)?.folderId)).toEqual(['fld_board', 'fld_board']);
    expect(item(body, 'request:req_qahwa_pipeline')?.labelIds).toEqual(['lbl_cfo']);

    ({ body } = await call('PATCH', '/api/workspace/items', {
      keys: ['report:lib_gcc_coffee_2026'],
      archived: true,
    }));
    // Archiving unpins, so a restored item doesn't jump to the top unexpectedly.
    expect(item(body, 'report:lib_gcc_coffee_2026')).toMatchObject({
      archived: true,
      pinned: false,
    });

    ({ body } = await call('PATCH', '/api/workspace/items', {
      keys: ['report:lib_uae_retail'],
      title: 'UAE footfall for the board',
    }));
    expect(item(body, 'report:lib_uae_retail')).toMatchObject({
      title: 'UAE footfall for the board',
      originalTitle: 'UAE consumer retail: footfall and spending, 2026',
    });
    ({ body } = await call('PATCH', '/api/workspace/items', {
      keys: ['report:lib_uae_retail'],
      title: null,
    }));
    expect(item(body, 'report:lib_uae_retail')?.title).toBe(
      'UAE consumer retail: footfall and spending, 2026',
    );
  });

  it('refuses items the client doesn’t own', async () => {
    logIn('usr_bilal');
    const { status } = await call('PATCH', '/api/workspace/items', {
      keys: ['report:lib_gcc_coffee_2026'],
      pinned: true,
    });
    expect(status).toBe(404);
  });

  it('deleting a label takes it off every item', async () => {
    logIn('usr_ayesha');
    const { body } = await call('DELETE', '/api/workspace/labels/lbl_board');
    expect(body.labels.map((l) => l.id)).not.toContain('lbl_board');
    expect(item(body, 'report:lib_gcc_coffee_2026')?.labelIds).toEqual([]);
  });

  it('shows a brand-new workspace when Empty data is on', async () => {
    logIn('usr_ayesha');
    setControls({ emptyData: true });
    const { body } = await call('GET', '/api/workspace');
    expect(body).toEqual({ folders: [], labels: [], items: [] });
  });
});
