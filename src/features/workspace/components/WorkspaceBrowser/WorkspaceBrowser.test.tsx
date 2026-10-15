import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { WorkspaceBrowser } from './WorkspaceBrowser';

const GCC = 'GCC specialty coffee 2026: growth, pricing and competition';
const UAE = 'UAE consumer retail: footfall and spending, 2026';
const QAHWA = 'Qahwa House: store pipeline and competitive response';

const meta = (key: string) => db.get().workspaces.usr_ayesha?.items[key];

function render(search = '') {
  mockLocation.pathname = '/workspace';
  mockLocation.search = search;
  return renderWithProviders(<WorkspaceBrowser />, { persona: 'ayesha' });
}

/** Carbon positions floating menus after layout, which jsdom doesn't do, so they stay
 * visibility: hidden here and role queries can't name their items. */
async function chooseMenuItem(name: string) {
  const menu = await screen.findByRole('menu', { hidden: true });
  await userEvent.click(within(menu).getByText(name));
}

describe('WorkspaceBrowser (F5)', () => {
  it('lists everything with folders, labels and pinned items first', async () => {
    const { container } = render();
    const table = await screen.findByRole('table', { name: 'All items' });
    const links = within(table)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links[0]).toBe(GCC);
    expect(within(table).getByText('For the board')).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'Folders' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /^Competitors/ })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('moves selected items to a folder, then undoes it', async () => {
    render();
    await userEvent.click(await screen.findByRole('checkbox', { name: `Select ${UAE}` }));
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${QAHWA}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to folder' }));
    const dialog = await screen.findByRole('dialog', { name: 'Move 2 items' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Move to'), 'Board pack Q4');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move' }));

    expect(await screen.findByText('Moved 2 items to “Board pack Q4”.')).toBeInTheDocument();
    expect(meta('report:lib_uae_retail')?.folderId).toBe('fld_board');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(meta('report:lib_uae_retail')?.folderId).toBeNull());
    expect(meta('request:req_qahwa_pipeline')?.folderId).toBe('fld_competitors');
  });

  it('archives from the row menu with undo', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: `Actions for ${UAE}` }));
    await chooseMenuItem('Archive');
    expect(await screen.findByText(`Archived “${UAE}”.`)).toBeInTheDocument();
    expect(meta('report:lib_uae_retail')?.archived).toBe(true);
    expect(screen.queryByRole('link', { name: UAE })).not.toBeInTheDocument();
  });

  it('creates a folder and opens it', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'New folder' }));
    const dialog = await screen.findByRole('dialog', { name: 'New folder' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create folder' }));
    expect(await within(dialog).findByText('Name the folder.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Folder name'), 'Riyadh launch');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create folder' }));
    await waitFor(() =>
      expect(db.get().workspaces.usr_ayesha?.folders.map((f) => f.name)).toContain('Riyadh launch'),
    );
    const created = db.get().workspaces.usr_ayesha?.folders.find((f) => f.name === 'Riyadh launch');
    expect(mockRouter.replace).toHaveBeenCalledWith(`/workspace?view=${created?.id}`, {
      scroll: false,
    });
  });

  it('renames an item and can go back to the original name', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: `Actions for ${UAE}` }));
    await chooseMenuItem('Rename');
    const dialog = await screen.findByRole('dialog', { name: 'Rename' });
    const input = within(dialog).getByLabelText('Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'UAE footfall');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save name' }));
    expect(await screen.findByRole('link', { name: 'UAE footfall' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('link', { name: UAE })).toBeInTheDocument();
  });

  it('deletes a folder without deleting what was in it', async () => {
    render('?view=fld_qahwa');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for folder Qahwa House expansion' }),
    );
    await chooseMenuItem('Delete folder');
    const dialog = await screen.findByRole('dialog', { name: 'Delete “Qahwa House expansion”?' });
    expect(within(dialog).getByText(/also deletes its subfolder/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete folder' }));
    await waitFor(() => expect(meta('report:lib_gcc_coffee_2026')?.folderId).toBeNull());
    expect(mockRouter.replace).toHaveBeenCalledWith('/workspace', { scroll: false });
  });

  it('teaches what to do in an empty folder', async () => {
    render('?view=fld_board');
    expect(
      await screen.findByRole('heading', { name: 'This folder is empty' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to All items' })).toBeInTheDocument();
  });

  it('says when a search finds nothing and offers to clear it', async () => {
    render('?q=zanzibar');
    expect(
      await screen.findByRole('heading', { name: 'No matches for “zanzibar”' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(mockRouter.replace).toHaveBeenCalledWith('/workspace', { scroll: false });
  });

  it('filters by label from the side list', async () => {
    render('?labels=lbl_follow_up');
    const table = await screen.findByRole('table', { name: 'All items' });
    expect(within(table).getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Follow up/, pressed: true })).toBeInTheDocument();
  });

  it('starts first-time clients at the goal chat', async () => {
    setControls({ emptyData: true });
    render();
    expect(
      await screen.findByRole('heading', { name: 'Nothing to organise yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a research goal' })).toHaveAttribute(
      'href',
      '/ask',
    );
  });
});
