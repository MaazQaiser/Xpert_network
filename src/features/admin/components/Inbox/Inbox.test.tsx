import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { db, server, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { Inbox } from './Inbox';
import { connectTiming, signInBarHeight } from './ConnectLinkedinModal';

// The pause before the browser starts after signing in (6 seconds in the app).
connectTiming.settleMs = 0;

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
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Connect mailbox' }));
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

  it('says when the sender’s LinkedIn needs signing in again', async () => {
    server.use(
      http.get('/api/getsales/sender-profiles', () =>
        HttpResponse.json([
          {
            uuid: '50181726-f022-4c23-8116-1c45e97f8a19',
            firstName: 'Ateeb',
            lastName: 'Ahmad',
            label: null,
            status: 'enabled',
            linkedinConnected: true,
            avatarUrl: null,
            createdAt: '2026-11-11T09:53:13.000Z',
            linkedinState: 'login_issue',
            linkedinIssue: 'LinkedIn asked for a verification code.',
            outsideHoursUntil: null,
          },
        ]),
      ),
    );
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    expect(await screen.findByText(/LinkedIn · Needs sign-in/)).toBeInTheDocument();
    expect(screen.queryByText(/LinkedIn · Connected/)).not.toBeInTheDocument();
    expect(screen.getByText('LinkedIn asked for a verification code.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ateeb Ahmad' }));
    const group = await screen.findByRole('group', { name: 'LinkedIn senders' });
    expect(
      within(group).getByRole('menuitem', { name: 'Ateeb Ahmad · needs sign-in' }),
    ).toBeInTheDocument();
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

  it('resends a message refused for a non-connection as a connection request', async () => {
    const sahar = {
      id: 'lead_sahar',
      lead: {
        uuid: 'lead_sahar',
        name: 'Sahar A',
        headline: 'Senior Manager UX',
        company: null,
        linkedinUrl: 'https://www.linkedin.com/in/sahar',
        avatarUrl: null,
      },
      lastMessageAt: '2026-11-11T15:08:00.000Z',
      unread: 0,
      messages: [
        {
          uuid: 'm_sahar',
          direction: 'sent',
          text: 'Hi Sahar, would you be open to a short paid call?',
          subject: null,
          sentAt: '2026-11-11T15:08:00.000Z',
          status: 'failed',
          linkedinType: 'message',
          failReason:
            'Message failed: the lead is not a 1st-degree connection (RECIPIENT_NOT_FIRST_DEGREE_CONNECTION)',
          read: true,
        },
      ],
    };
    const invites: string[] = [];
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/conversations', () =>
        HttpResponse.json([sahar]),
      ),
      http.post(
        '/api/getsales/sender-profiles/:uuid/leads/:leadUuid/connect',
        async ({ request }) => {
          invites.push(((await request.json()) as { note: string }).note);
          return HttpResponse.json({ flowUuid: 'flow_1', status: 'queued' }, { status: 201 });
        },
      ),
    );
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_sahar';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('article', { name: 'Sahar A' });
    expect(
      within(thread).getByText(/Sahar isn’t a 1st-degree connection, and LinkedIn only lets you/),
    ).toBeInTheDocument();
    // Retrying the message would only fail again.
    expect(within(thread).queryByRole('button', { name: 'Retry sending' })).toBeNull();

    await userEvent.click(
      within(thread).getByRole('button', { name: 'Send as connection request' }),
    );
    expect(
      await within(thread).findByText(/Sent as a connection request instead/),
    ).toBeInTheDocument();
    expect(invites).toEqual(['Hi Sahar, would you be open to a short paid call?']);
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

  it('shows a message waiting for the sender’s next schedule window as sending', async () => {
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/conversations', () =>
        HttpResponse.json([
          {
            id: 'lead_hassan',
            lead: {
              uuid: 'lead_hassan',
              name: 'Hassan Islam',
              headline: null,
              company: null,
              linkedinUrl: null,
              avatarUrl: null,
            },
            lastMessageAt: '2026-11-12T08:48:52.000Z',
            unread: 0,
            messages: [
              {
                uuid: 'queued',
                direction: 'sent',
                text: 'This is a test msg. Ignore',
                subject: null,
                sentAt: null,
                status: 'new',
                linkedinType: 'message',
                failReason: null,
                read: true,
              },
            ],
          },
        ]),
      ),
    );
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const messages = await screen.findByRole('list', { name: 'Messages with Hassan Islam' });
    expect(within(messages).getByText('Sending…')).toBeInTheDocument();
  });

  it('changes when the sender’s LinkedIn messages go out', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sends Mon–Fri, 09:00–18:00' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('LinkedIn schedule')).toBeInTheDocument();
    expect(within(dialog).getByRole('switch', { name: 'Mon' })).toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Sat' })).not.toBeChecked();
    expect(within(dialog).getByLabelText('Mon from')).toHaveValue('09:00');
    await expectNoAxeViolations(dialog);

    // An end before the start is caught here, not by GetSales.
    const monTo = within(dialog).getByLabelText('Mon to');
    await userEvent.clear(monTo);
    await userEvent.type(monTo, '08:00');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save schedule' }));
    expect(await within(dialog).findByText('End after the start.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: '24 hours, every day' }));
    expect(within(dialog).getByRole('switch', { name: 'Sat' })).toBeChecked();
    expect(within(dialog).getByLabelText('Mon to')).toHaveValue('23:59');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save schedule' }));

    expect(
      await screen.findByRole('button', { name: 'Sends 24 hours, every day' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('disconnects the sender’s LinkedIn after saying what stops working', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const disconnects: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'DELETE') disconnects.push(new URL(request.url).pathname);
    });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Disconnect Ateeb Ahmad’s LinkedIn?')).toBeInTheDocument();
    expect(within(dialog).getByText(/still waiting to go out won’t be sent/)).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    // Cancel leaves it connected.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(disconnects).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disconnect' }),
    );
    expect(await screen.findByText(/LinkedIn · Not connected/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(disconnects).toEqual([
      '/api/getsales/sender-profiles/50181726-f022-4c23-8116-1c45e97f8a19/linkedin',
    ]);
    // Nothing left to disconnect.
    expect(screen.queryByRole('button', { name: 'More for Ateeb Ahmad' })).toBeNull();
    // The account menu no longer lists it; connecting again starts from Connect LinkedIn account.
    await userEvent.click(screen.getByRole('button', { name: 'Ateeb Ahmad' }));
    expect(await screen.findByRole('menuitem', { name: 'Connect LinkedIn account' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Connect mailbox' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: /Ateeb Ahmad/ })).toBeNull();
    server.events.removeAllListeners();
  });

  it('reconnects a disconnected sender with the same name instead of adding another', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const creates: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname === '/api/getsales/sender-profiles'
      )
        creates.push(request.url);
    });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disconnect' }),
    );
    await screen.findByText(/LinkedIn · Not connected/);
    await userEvent.click(screen.getByRole('button', { name: 'Ateeb Ahmad' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Connect LinkedIn account' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('First name'), 'ateeb');
    await userEvent.type(within(dialog).getByLabelText('Last name'), 'Ahmad ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('dialog', { name: 'Connect Ateeb Ahmad’s LinkedIn' }),
    ).toBeInTheDocument();
    expect(creates).toEqual([]);
    server.events.removeAllListeners();
  });

  it('keeps the dialog open and explains when disconnecting fails', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    server.use(
      http.delete('/api/getsales/sender-profiles/:uuid/linkedin', () =>
        HttpResponse.json(
          { code: 'rejected', message: 'The LinkedIn account is busy. Try again in a minute.' },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
    expect(await within(dialog).findByText('Couldn’t disconnect LinkedIn.')).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn · Connected/)).toBeInTheDocument();
  });

  it('picks a schedule time from hour and minute lists', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sends Mon–Fri, 09:00–18:00' }),
    );
    const dialog = await screen.findByRole('dialog');
    const monFrom = within(dialog).getByLabelText('Mon from');
    expect(monFrom).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(monFrom);
    expect(monFrom).toHaveAttribute('aria-expanded', 'true');
    // Carbon's auto-aligned popover stays `visibility: hidden` in jsdom (nothing to measure), which
    // also blanks accessible names, so the lists are found by id and their options by text. In a
    // browser they show below the field.
    const lists = document.getElementById('schedule-1-start-lists') as HTMLElement;
    const [hours, minutes] = within(lists).getAllByRole('group', { hidden: true }) as [
      HTMLElement,
      HTMLElement,
    ];
    expect(hours).toHaveAttribute('aria-label', 'Mon from, hour');
    expect(minutes).toHaveAttribute('aria-label', 'Mon from, minute');
    // 00 to 23 and 00 to 59, with the current time marked.
    expect(within(hours).getAllByRole('button', { hidden: true })).toHaveLength(24);
    expect(within(minutes).getAllByRole('button', { hidden: true })).toHaveLength(60);
    expect(within(hours).getByText('09')).toHaveAttribute('aria-pressed', 'true');
    await expectNoAxeViolations(dialog);

    await userEvent.click(within(hours).getByText('10'));
    expect(monFrom).toHaveValue('10:00');
    await userEvent.click(within(minutes).getByText('30'));
    expect(monFrom).toHaveValue('10:30');
    // Picking the minute closes the lists; typing still works.
    expect(monFrom).toHaveAttribute('aria-expanded', 'false');
    await userEvent.clear(monFrom);
    await userEvent.type(monFrom, '07:15');
    expect(monFrom).toHaveValue('07:15');

    // Escape closes the lists but keeps the dialog open.
    await userEvent.click(monFrom);
    await userEvent.keyboard('{Escape}');
    expect(monFrom).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('marks a thread Approaching in the list until they reply', async () => {
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/conversations', () =>
        HttpResponse.json([
          {
            id: 'lead_sahar',
            lead: {
              uuid: 'lead_sahar',
              name: 'Sahar A',
              headline: 'Senior Manager UX',
              company: null,
              linkedinUrl: null,
              avatarUrl: null,
            },
            lastMessageAt: '2026-11-11T20:49:15Z',
            unread: 0,
            approachedAt: '2026-11-11T20:49:15Z',
            sentiment: null,
            messages: [
              {
                uuid: 'note',
                direction: 'sent',
                text: 'Hi Sahar, would you do a paid call?',
                subject: null,
                sentAt: '2026-11-11T20:49:15Z',
                status: 'done',
                linkedinType: 'connection_note',
                failReason: null,
                read: true,
              },
            ],
          },
        ]),
      ),
    );
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    const list = await screen.findByRole('list', { name: 'Conversations' });
    const row = within(list).getByRole('link', { name: /Sahar A/ });
    expect(within(row).getByText('Approaching')).toBeInTheDocument();
  });

  it('shows what happened between messages, and how the reply reads', async () => {
    const message = (
      uuid: string,
      direction: 'sent' | 'received',
      text: string,
      sentAt: string,
    ) => ({
      uuid,
      direction,
      text,
      subject: null,
      sentAt,
      status: 'done',
      linkedinType: uuid === 'note' ? 'connection_note' : 'message',
      failReason: null,
      read: true,
      sentiment: null as string | null,
    });
    const reply = { ...message('r1', 'received', 'no thanks', '2026-11-11T16:00:00Z') };
    reply.sentiment = 'not_interested';
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/conversations', () =>
        HttpResponse.json([
          {
            id: 'lead_umar',
            lead: {
              uuid: 'lead_umar',
              name: 'Umar Sarwar',
              headline: null,
              company: null,
              linkedinUrl: null,
              avatarUrl: null,
            },
            lastMessageAt: '2026-11-11T16:00:00Z',
            unread: 0,
            approachedAt: '2026-11-11T15:34:35Z',
            sentiment: 'not_interested',
            messages: [
              message('note', 'sent', 'Hi Umar, would you do a paid call?', '2026-11-11T15:34:35Z'),
              message('m1', 'sent', 'It’s 30 minutes, paid.', '2026-11-11T15:40:00Z'),
              reply,
            ],
          },
        ]),
      ),
      http.get('/api/getsales/sender-profiles/:uuid/leads/:leadUuid/activity', () =>
        HttpResponse.json([
          { kind: 'connection_accepted', at: '2026-11-11T15:36:00Z', messageUuid: 'note' },
          { kind: 'message_opened', at: '2026-11-11T15:50:00Z', messageUuid: 'm1' },
          { kind: 'message_opened', at: '2026-11-11T15:55:00Z', messageUuid: 'm1' },
        ]),
      ),
    );
    mockLocation.search =
      'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_umar';
    const { container } = renderWithProviders(<Inbox />, { persona: 'ops' });
    const thread = await screen.findByRole('list', { name: 'Messages with Umar Sarwar' });
    await within(thread).findByText('Umar saw your message');

    // In order: note, Approaching, accepted, message, seen (once), reply, its label.
    const rows = within(thread)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    expect(rows).toHaveLength(7);
    expect(rows[0]).toContain('Hi Umar, would you do a paid call?');
    expect(rows[1]).toContain('Approaching');
    expect(rows[2]).toContain('Umar accepted your connection request');
    expect(rows[3]).toContain('It’s 30 minutes, paid.');
    expect(rows[4]).toContain('Umar saw your message');
    expect(rows[5]).toContain('no thanks');
    expect(rows[6]).toContain('Not interested');

    // The list shows the latest reply's label too.
    const list = screen.getByRole('list', { name: 'Conversations' });
    expect(within(list).getByText('Not interested')).toBeInTheDocument();
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

  it('creates a sender profile from Connect LinkedIn account and switches to it', async () => {
    mockLocation.pathname = '/admin/inbox';
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'projects@xpertnetwork.example' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Connect LinkedIn account' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Connect a LinkedIn account')).toBeInTheDocument();

    // Both names are required.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await within(dialog).findByText('Enter a first name.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('First name'), 'Sara');
    await userEvent.type(within(dialog).getByLabelText('Last name'), 'Khan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/admin/inbox?account=sender%3Asp_2', {
        scroll: false,
      }),
    );
    // Then straight on to connecting its LinkedIn, starting with the proxy.
    const connect = await screen.findByRole('dialog', { name: /Connect .*LinkedIn/ });
    expect(connect).toHaveAccessibleName('Connect Sara Khan’s LinkedIn');
    expect(within(connect).getByRole('radio', { name: 'Use Exscio proxy' })).toBeChecked();
  });

  it('connects LinkedIn again after disconnecting: proxy, cloud browser, session check', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    const calls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      const path = new URL(request.url).pathname;
      if (path.includes('/linkedin')) calls.push(`${request.method} ${path.split('/').pop()}`);
    });
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disconnect' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Connect LinkedIn' }));

    // 1. Set proxy: a country is required.
    let dialog = await screen.findByRole('dialog', { name: /Connect .*LinkedIn/ });
    await expectNoAxeViolations(dialog);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(await within(dialog).findByText('Choose a country.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('combobox', { name: 'Country' }), 'pak');
    await userEvent.click(await screen.findByRole('option', { name: 'Pakistan' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

    // 2. Sign in to LinkedIn in the cloud browser, shown in the app.
    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Open cloud browser' }),
    );
    dialog = await screen.findByRole('dialog', { name: /Sign in to .*LinkedIn/ });
    expect(within(dialog).getByTitle('Cloud browser for Ateeb Ahmad')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'I have logged in' }));

    // 3. The session is checked until the account shows as connected.
    dialog = await screen.findByRole('dialog', { name: /Connect .*LinkedIn/ });
    expect(await within(dialog).findByText('LinkedIn connected.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/LinkedIn · Connected/)).toBeInTheDocument();
    expect(calls).toEqual([
      'DELETE linkedin',
      'PUT proxy',
      'POST sign-in',
      'POST check',
      'GET session',
    ]);
    server.events.removeAllListeners();
  });

  it('crops the sign-in bar by the height it has at the frame’s width', () => {
    expect(signInBarHeight(1400)).toBe(49);
    expect(signInBarHeight(1000)).toBe(61);
    expect(signInBarHeight(600)).toBe(105);
  });

  it('says so when LinkedIn still isn’t signed in after I have logged in', async () => {
    mockLocation.search = 'account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19';
    server.use(
      http.get('/api/getsales/sender-profiles/:uuid/linkedin/session', () =>
        HttpResponse.json({ state: 'signed_out', issue: null }),
      ),
    );
    renderWithProviders(<Inbox />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'More for Ateeb Ahmad' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Disconnect' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Disconnect' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Connect LinkedIn' }));
    let dialog = await screen.findByRole('dialog', { name: /Connect .*LinkedIn/ });
    await userEvent.type(within(dialog).getByRole('combobox', { name: 'Country' }), 'Germ');
    await userEvent.click(await screen.findByRole('option', { name: 'Germany' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Open cloud browser' }),
    );
    dialog = await screen.findByRole('dialog', { name: /Sign in to .*LinkedIn/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'I have logged in' }));
    dialog = await screen.findByRole('dialog', { name: /Connect .*LinkedIn/ });
    expect(await within(dialog).findByText('LinkedIn isn’t signed in yet.')).toBeInTheDocument();
    // Opening the browser again is the next step.
    expect(within(dialog).getByRole('button', { name: 'Open cloud browser' })).toBeEnabled();
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
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Connect LinkedIn account' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('First name'), 'Sara');
    await userEvent.type(within(dialog).getByLabelText('Last name'), 'Khan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
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
