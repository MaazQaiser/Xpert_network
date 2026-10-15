import { describe, expect, it } from 'vitest';
import {
  folderDestinations,
  folderOptions,
  folderPathLabel,
  itemsInView,
  matchesFilters,
  parseView,
  sortItems,
  type Folder,
  type Label,
  type WorkspaceItem,
} from './workspace.schema';

const folders: Folder[] = [
  { id: 'f_qahwa', name: 'Qahwa House expansion', parentId: null, createdAt: '' },
  { id: 'f_comp', name: 'Competitors', parentId: 'f_qahwa', createdAt: '' },
  { id: 'f_board', name: 'Board pack', parentId: null, createdAt: '' },
];
const labels: Label[] = [{ id: 'lbl_cfo', name: 'For the CFO', color: 'teal' }];

function item(overrides: Partial<WorkspaceItem>): WorkspaceItem {
  return {
    key: 'report:x',
    type: 'report',
    sourceId: 'x',
    title: 'GCC coffee chains',
    originalTitle: 'GCC coffee chains',
    meta: 'Library report',
    href: '/library/x/read',
    updatedAt: '2026-10-01T00:00:00.000Z',
    folderId: null,
    labelIds: [],
    pinned: false,
    archived: false,
    ...overrides,
  };
}

describe('workspace model (F5)', () => {
  it('reads views from the URL and falls back to all items', () => {
    expect(parseView('pinned', folders)).toBe('pinned');
    expect(parseView('f_comp', folders)).toEqual({ folderId: 'f_comp' });
    expect(parseView('f_gone', folders)).toBe('all');
    expect(parseView(null, folders)).toBe('all');
  });

  it('shows a folder’s own and its subfolders’ items, never archived ones', () => {
    const items = [
      item({ key: 'a', folderId: 'f_qahwa' }),
      item({ key: 'b', folderId: 'f_comp' }),
      item({ key: 'c', folderId: 'f_comp', archived: true }),
      item({ key: 'd', folderId: null, pinned: true }),
    ];
    expect(itemsInView(items, { folderId: 'f_qahwa' }, folders).map((i) => i.key)).toEqual([
      'a',
      'b',
    ]);
    expect(itemsInView(items, { folderId: 'f_comp' }, folders).map((i) => i.key)).toEqual(['b']);
    expect(itemsInView(items, 'unfiled', folders).map((i) => i.key)).toEqual(['d']);
    expect(itemsInView(items, 'pinned', folders).map((i) => i.key)).toEqual(['d']);
    expect(itemsInView(items, 'archived', folders).map((i) => i.key)).toEqual(['c']);
  });

  it('keeps folders two levels deep', () => {
    // Qahwa has a subfolder, so it can only stay at the top level.
    expect(folderDestinations(folders, 'f_qahwa')).toEqual([null]);
    expect(folderDestinations(folders, 'f_board').map((f) => f?.id ?? null)).toEqual([
      null,
      'f_qahwa',
    ]);
    expect(folderOptions(folders).map((o) => `${o.depth}:${o.folder.name}`)).toEqual([
      '0:Board pack',
      '0:Qahwa House expansion',
      '1:Competitors',
    ]);
    expect(folderPathLabel(folders, 'f_comp')).toBe('Qahwa House expansion / Competitors');
  });

  it('searches titles and label names and requires every chosen label', () => {
    const labelled = item({ labelIds: ['lbl_cfo'] });
    expect(matchesFilters(labelled, { q: 'cfo', type: null, labelIds: [] }, labels)).toBe(true);
    expect(matchesFilters(item({}), { q: '', type: null, labelIds: ['lbl_cfo'] }, labels)).toBe(
      false,
    );
    expect(matchesFilters(item({}), { q: '', type: 'brief', labelIds: [] }, labels)).toBe(false);
  });

  it('puts pinned items first, then the newest', () => {
    const sorted = sortItems([
      item({ key: 'old', updatedAt: '2026-01-01' }),
      item({ key: 'new', updatedAt: '2026-09-01' }),
      item({ key: 'pin', updatedAt: '2025-01-01', pinned: true }),
    ]);
    expect(sorted.map((i) => i.key)).toEqual(['pin', 'new', 'old']);
  });
});
