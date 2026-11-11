import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { db, server, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { Inbox } from './Inbox';

describe('Inbox (F12, screen 02)', () => {
  it('lists client emails and opens the selected one', async () => {
    const { container } = renderWithProviders(<Inbox selectedId="req_ridgeline_audio" />, {
      persona: 'ops',
    });
    const list = await screen.findByRole('list', { name: 'Requests' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getByRole('link', { name: /Jenna Cho/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    const pane = screen.getByRole('article', { name: /sports headphones/i });
    expect(within(pane).getByRole('link', { name: 'Open project file' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042',
    );
    expect(within(pane).getByText('2 things need confirming:')).toBeInTheDocument();
    // The AI's step-by-step log isn't shown in the email any more.
    expect(within(pane).queryByText('What the system did')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('filters by view through the URL', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: /^Attachments/ }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/admin/inbox?view=attachments', {
      scroll: false,
    });
  });

  it('shows only unread emails, and opening one marks it read', async () => {
    mockLocation.search = 'view=unread';
    renderWithProviders(<Inbox selectedId="req_northgate_meddist" />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Requests' });
    expect(screen.getByRole('button', { name: /^Unread/ })).toHaveAttribute('aria-pressed', 'true');
    // Two unread to start; opening Amy's email reads it.
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(db.get().adminInbox['req_northgate_meddist']?.read).toBe(true);
  });

  it('shows only the emails of the chosen mailbox', async () => {
    mockLocation.search = 'account=partners%40xpertnetwork.example';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Requests' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
    expect(within(list).getByText('Mei Tanaka')).toBeInTheDocument();
  });

  it('connects another mailbox and switches to it', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Connect a mailbox' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Connect another mailbox')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByLabelText('Microsoft 365'));
    await userEvent.type(
      within(dialog).getByLabelText('Mailbox address'),
      'briefs@xpertnetwork.example',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Connect mailbox' }));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/admin/inbox?account=briefs%40xpertnetwork.example',
        { scroll: false },
      ),
    );
    expect(db.get().adminMailAccounts.map((a) => a.address)).toContain(
      'briefs@xpertnetwork.example',
    );
  });

  it('lists LinkedIn senders in the account switcher with their unread count', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    // Hassan's reply is unread; the LinkedIn icon replaces the word "LinkedIn".
    const group = await screen.findByRole('group', { name: 'LinkedIn senders' });
    const item = await within(group).findByRole('menuitem', { name: 'Ateeb Ahmad · 1 unread' });
    expect(item.querySelector('svg')).toBeInTheDocument();
    await userEvent.click(item);
    expect(mockRouter.replace).toHaveBeenCalledWith(
      '/admin/inbox?account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19',
      { scroll: false },
    );
  });

  it('shows the chosen sender by name', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByRole('button', { name: 'Ateeb Ahmad' })).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn · Connected/)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('lists the conversations of a sender and leaves new replies unread', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Conversations' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Hassan Islam')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Sure, happy to help.')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Unread:')).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/^You: Hi Sana/)).toBeInTheDocument();
    // Profile photo when there is one, initials otherwise.
    expect(rows[0]!.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/hassan.jpg');
    expect(within(rows[1]!).getByText('SM')).toBeInTheDocument();

    // Nothing opens by itself, so Hassan's reply stays unread.
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('No conversation open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unread 1' })).toBeInTheDocument();
    // No attachments on LinkedIn here.
    expect(screen.queryByRole('button', { name: /^Attachments/ })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('opening a conversation shows it and marks the reply read', async () => {
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('article', { name: 'Hassan Islam' });
    const messages = within(thread).getByRole('list', { name: 'Messages with Hassan Islam' });
    expect(within(messages).getAllByRole('listitem')).toHaveLength(2);
    expect(within(thread).getByRole('link', { name: /LinkedIn profile/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/hassan-islam-3bbb98111',
    );
    // Photos beside the messages: the lead's on the left, the sender's initials on the right.
    expect(within(messages).getAllByText('AA')).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Unread 0' })).toBeInTheDocument(),
    );
    await expectNoAxeViolations(container);
  });

  it('opens the chosen conversation and shows why a message failed', async () => {
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_sana';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('article', { name: 'Sana Mirza' });
    expect(within(thread).getByText('Connection note')).toBeInTheDocument();
    expect(
      within(thread).getByText('Not sent: Connection request limit reached'),
    ).toBeInTheDocument();
    expect(within(thread).queryByRole('link', { name: /LinkedIn profile/ })).toBeNull();
  });

  it('resends a failed message from its retry button', async () => {
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_sana';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('article', { name: 'Sana Mirza' });
    await userEvent.click(within(thread).getByRole('button', { name: 'Retry sending' }));
    const messages = within(thread).getByRole('list', { name: 'Messages with Sana Mirza' });
    // Still one message: the failed copy is replaced by the queued resend.
    await waitFor(() => expect(within(messages).getByText('Sending…')).toBeInTheDocument());
    expect(within(messages).getAllByRole('listitem')).toHaveLength(1);
    expect(within(messages).queryByText(/Not sent/)).not.toBeInTheDocument();
  });

  it('keeps the failed message and says why when a retry fails too', async () => {
    server.use(
      http.post('/api/getsales/sender-profiles/:uuid/leads/:leadUuid/messages', () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'Connection request limit reached.' },
          { status: 422 },
        ),
      ),
    );
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_sana';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('article', { name: 'Sana Mirza' });
    await userEvent.click(within(thread).getByRole('button', { name: 'Retry sending' }));
    expect(
      await within(thread).findByText('Still not sent: Connection request limit reached.'),
    ).toBeInTheDocument();
    expect(within(thread).getByRole('button', { name: 'Retry sending' })).toBeEnabled();
  });

  it('searches conversations by lead and message text', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&q=café';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Conversations' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Sana Mirza')).toBeInTheDocument();
  });

  it('sends a reply through GetSales and shows it as queued', async () => {
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    const reply = await screen.findByRole('form', { name: 'Reply to Hassan Islam' });
    const field = within(reply).getByLabelText('Message Hassan Islam');

    // Nothing to send yet.
    await userEvent.click(within(reply).getByRole('button', { name: 'Send' }));
    expect(await within(reply).findByText('Write a message first.')).toBeInTheDocument();

    await userEvent.type(field, 'Great, does Thursday 3pm work?');
    await userEvent.click(within(reply).getByRole('button', { name: 'Send' }));

    const messages = screen.getByRole('list', { name: 'Messages with Hassan Islam' });
    await waitFor(() => expect(within(messages).getAllByRole('listitem')).toHaveLength(3));
    expect(within(messages).getByText('Great, does Thursday 3pm work?')).toBeInTheDocument();
    expect(within(messages).getByText('Sending…')).toBeInTheDocument();
    expect(field).toHaveValue('');
    await expectNoAxeViolations(container);
  });

  it('sends with Ctrl + Enter but keeps plain Enter for new lines', async () => {
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const field = await screen.findByLabelText('Message Hassan Islam');
    await userEvent.type(field, 'Line one{Enter}line two');
    expect(field).toHaveValue('Line one\nline two');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    const messages = screen.getByRole('list', { name: 'Messages with Hassan Islam' });
    await waitFor(() => expect(within(messages).getAllByRole('listitem')).toHaveLength(3));
  });

  it('keeps the draft and explains when GetSales refuses the message', async () => {
    server.use(
      http.post('/api/getsales/sender-profiles/:uuid/leads/:leadUuid/messages', () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'The lead is not connected to this sender.' },
          { status: 422 },
        ),
      ),
    );
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const reply = await screen.findByRole('form', { name: 'Reply to Hassan Islam' });
    const field = within(reply).getByLabelText('Message Hassan Islam');
    await userEvent.type(field, 'Hello again');
    await userEvent.click(within(reply).getByRole('button', { name: 'Send' }));
    expect(
      await within(reply).findByText('The lead is not connected to this sender.'),
    ).toBeInTheDocument();
    expect(field).toHaveValue('Hello again');
  });

  it('lets you retry when the conversations fail to load', async () => {
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/conversations', () =>
        HttpResponse.json(
          { code: 'getsales_error', message: 'GetSales isn’t responding.' },
          { status: 502 },
        ),
      ),
    );
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByText('LinkedIn conversations didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again|retry/i })).toBeInTheDocument();
  });

  it('creates a sender profile from Add another account and switches to it', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Add another account' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Add a LinkedIn sender')).toBeInTheDocument();

    // Both names are required.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create sender' }));
    expect(await within(dialog).findByText('Enter a first name.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('First name'), 'Sara');
    await userEvent.type(within(dialog).getByLabelText('Last name'), 'Khan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create sender' }));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/admin/inbox?account=sender%3Asp_2', {
        scroll: false,
      }),
    );
  });

  it('explains when GetSales rejects the new sender', async () => {
    server.use(
      http.post('/api/getsales/sender-profiles', () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'The first name field is too long.' },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Add another account' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('First name'), 'Sara');
    await userEvent.type(within(dialog).getByLabelText('Last name'), 'Khan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create sender' }));
    expect(
      await within(dialog).findByText('The first name field is too long.'),
    ).toBeInTheDocument();
  });

  it('shows the attachment as a card and previews it', async () => {
    renderWithProviders(<Inbox selectedId="req_ridgeline_audio" />, { persona: 'ops' });
    expect(await screen.findByRole('heading', { name: 'One attachment' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Preview Sports_Headphones/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Page 1 of 14')).toBeInTheDocument();
  });

  it('explains a password-protected file instead of opening it', async () => {
    renderWithProviders(<Inbox selectedId="req_corvid_fintech" />, { persona: 'ops' });
    expect(
      await screen.findByText(/is password-protected. We never try to open/),
    ).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    setControls({ emptyData: true });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByText('No emails yet')).toBeInTheDocument();
  });

  it('opens on the LinkedIn sender when no mailbox is connected', async () => {
    db.update((draft) => {
      draft.adminInbox = {};
      draft.adminMailAccounts = [];
    });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByRole('button', { name: 'Ateeb Ahmad' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Conversations' })).toBeInTheDocument();
  });

  it('says nothing is connected when there is no mailbox or sender', async () => {
    db.update((draft) => {
      draft.adminInbox = {};
      draft.adminMailAccounts = [];
    });
    server.use(http.get('/api/getsales/sender-profiles', () => HttpResponse.json([])));
    renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(
      await screen.findByRole('button', { name: 'No accounts connected' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No accounts connected' })).toBeInTheDocument();
    expect(screen.getByText(/Nothing connected yet/)).toBeInTheDocument();
  });
});
