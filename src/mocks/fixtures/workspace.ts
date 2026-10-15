import type { Folder, Label } from '@/features/workspace';

/** How the client has organised one item; items themselves come from briefs, reports and requests. */
export type ItemMeta = {
  folderId: string | null;
  labelIds: string[];
  pinned: boolean;
  archived: boolean;
  /** Set when the client renamed the item. */
  title: string | null;
};

export type StoredWorkspace = {
  folders: Folder[];
  labels: Label[];
  items: Record<string, ItemMeta>;
};

export const EMPTY_META: ItemMeta = {
  folderId: null,
  labelIds: [],
  pinned: false,
  archived: false,
  title: null,
};

const CREATED = '2026-08-20T09:00:00.000Z';

/** Ayesha has started organising her Qahwa House research; Bilal hasn't. */
export const SEED_WORKSPACES: Record<string, StoredWorkspace> = {
  usr_ayesha: {
    folders: [
      { id: 'fld_qahwa', name: 'Qahwa House expansion', parentId: null, createdAt: CREATED },
      { id: 'fld_competitors', name: 'Competitors', parentId: 'fld_qahwa', createdAt: CREATED },
      { id: 'fld_board', name: 'Board pack Q4', parentId: null, createdAt: CREATED },
    ],
    labels: [
      { id: 'lbl_board', name: 'For the board', color: 'blue' },
      { id: 'lbl_follow_up', name: 'Follow up', color: 'magenta' },
      { id: 'lbl_cfo', name: 'Shared with CFO', color: 'teal' },
    ],
    items: {
      'report:lib_gcc_coffee_2026': {
        ...EMPTY_META,
        folderId: 'fld_qahwa',
        labelIds: ['lbl_board'],
        pinned: true,
      },
      'request:req_qahwa_pipeline': {
        ...EMPTY_META,
        folderId: 'fld_competitors',
        labelIds: ['lbl_follow_up'],
      },
    },
  },
};
