import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expectNoAxeViolations } from '@/test/axe';
import { scioChatTitle, seedScioChat, server } from '@/test/mockBackend';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ChatNavMenu } from './ChatNavMenu';

const CHAT = {
  id: 'chat_coffee',
  title: 'Coffee brief summary',
  updatedAt: '2026-11-16T09:00:00Z',
};

function setUp() {
  seedScioChat({ ...CHAT, messages: [] });
  renderWithProviders(<ChatNavMenu chat={CHAT} />, { persona: 'ops' });
}

const openMenu = async () =>
  userEvent.click(await screen.findByRole('button', { name: 'Options for Coffee brief summary' }));

describe('a chat’s ⋯ menu in the side nav', () => {
  it('renames the chat', async () => {
    setUp();
    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog');
    await expectNoAxeViolations(dialog);
    const field = within(dialog).getByLabelText('Chat name');
    expect(field).toHaveValue('Coffee brief summary');

    // A name is required.
    await userEvent.clear(field);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Give the chat a name.')).toBeInTheDocument();

    await userEvent.type(field, 'Meridian GCC café');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(scioChatTitle(CHAT.id)).toBe('Meridian GCC café');
  });

  it('deletes the chat after saying it can’t be undone, and leaves it if it was open', async () => {
    mockLocation.pathname = '/admin/home/chat/chat_coffee';
    setUp();
    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete “Coffee brief summary”?')).toBeInTheDocument();
    expect(within(dialog).getByText(/can’t be undone/)).toBeInTheDocument();

    // Cancel keeps it.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(scioChatTitle(CHAT.id)).toBe('Coffee brief summary');

    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => expect(scioChatTitle(CHAT.id)).toBeUndefined());
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/home');
  });

  it('stays where you are when deleting a chat that isn’t open', async () => {
    mockLocation.pathname = '/admin/inbox';
    setUp();
    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => expect(scioChatTitle(CHAT.id)).toBeUndefined());
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and explains when deleting fails', async () => {
    server.use(
      http.delete('/api/scio/conversations/:id', () =>
        HttpResponse.json(
          { code: 'server_error', message: 'The server is busy.' },
          { status: 500 },
        ),
      ),
    );
    setUp();
    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByText('Couldn’t delete the chat.')).toBeInTheDocument();
    expect(scioChatTitle(CHAT.id)).toBe('Coffee brief summary');
  });
});
