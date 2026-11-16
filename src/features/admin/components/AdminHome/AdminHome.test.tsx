import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { seedScioChat, server, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockLocation, mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';

/** Asks Scio through the message box. */
const ask = async (text: string) => {
  const field = await screen.findByRole('textbox', { name: 'Ask Scio' });
  await userEvent.type(field, `${text}{Enter}`);
};

/** The chat ids Scio was asked in, in order. */
const captureChats = () => {
  const ids: string[] = [];
  server.events.on('request:start', async ({ request }) => {
    if (new URL(request.url).pathname === '/api/scio/chat') {
      const body = (await request.clone().json()) as { conversationId: string };
      ids.push(body.conversationId);
    }
  });
  return ids;
};

/** Finds a paragraph by its whole text, even when some words in it are bold. */
const paragraph = (pattern: RegExp) => (_: string, element: Element | null) =>
  element?.tagName === 'P' && pattern.test(element.textContent ?? '');

describe('AdminHome (F11, screen 01)', () => {
  it('greets the PM with a brief lede and summary counts', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(await screen.findByRole('heading', { name: /Hey Umer, good/ })).toBeInTheDocument();
    expect(
      await screen.findByText(
        paragraph(
          /3 new project emails came in\. 4 expert reviews are ready, and 2 projects are active/,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('link', {
        name: 'Expert reviews ready: 4. Ask the assistant which expert reviews need sign-off',
      }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows an error with retry when the summary fails', async () => {
    setControls({ apiError: true });
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(await screen.findByText('Today’s summary didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('counts new project emails from the brief mailbox', async () => {
    server.use(
      http.get('/api/mailbox/summary', () =>
        HttpResponse.json({ newToday: 5, newThisWeek: 7, source: 'Sample briefs (demo mailbox)' }),
      ),
    );
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(
      await screen.findByRole('link', { name: /^New project emails: 5\./ }),
    ).toBeInTheDocument();
    expect(screen.getByText(paragraph(/5 new project emails came in\./))).toBeInTheDocument();
  });

  it('keeps its own count when the mailbox can’t be reached', async () => {
    server.use(
      http.get('/api/mailbox/summary', () =>
        HttpResponse.json({ code: 'server_error', message: 'Down.' }, { status: 500 }),
      ),
    );
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(
      await screen.findByRole('link', { name: /^New project emails: \d+\./ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Today’s summary didn’t load')).toBeNull();
  });

  it('the mascot thinks while the summary loads, then rests', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    const mascot = () => container.querySelector('[data-mood]');
    expect(mascot()).toHaveAttribute('data-mood', 'thinking');
    await screen.findByRole('link', { name: /Expert reviews ready: 4/ });
    expect(mascot()).toHaveAttribute('data-mood', 'idle');
  });

  describe('Scio', () => {
    it('streams an answer with brief cards, next steps and what it was based on', async () => {
      const chats = captureChats();
      const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('What new briefs do we have?');

      expect(await screen.findByText('What new briefs do we have?')).toBeInTheDocument();
      expect(
        await screen.findByText(paragraph(/There is 1 new brief this week, from Meridian Capital/)),
      ).toBeInTheDocument();
      expect(screen.getByText('1 new brief').tagName).toBe('STRONG');
      const emails = screen.getByRole('list', { name: 'Emails' });
      expect(within(emails).getByText(/coffee franchise procurement/)).toBeInTheDocument();
      const steps = screen.getByRole('list', { name: 'Suggested next steps' });
      expect(
        within(steps)
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['Open the coffee brief', 'Draft a reply']);
      expect(screen.getByText('Based on: Sample briefs (demo mailbox)')).toBeInTheDocument();
      // Its steps are gone once the answer is in.
      expect(screen.queryByRole('region', { name: 'What Scio is doing' })).toBeNull();

      // The chat gets its own address, for the list under Home.
      expect(mockRouter.replace).toHaveBeenCalledWith(`/admin/home/chat/${chats[0]}`, {
        scroll: false,
      });
      await expectNoAxeViolations(container);
      server.events.removeAllListeners();
    });

    it('a next step asks it, in the same chat', async () => {
      const chats = captureChats();
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('What new briefs do we have?');
      await userEvent.click(await screen.findByRole('button', { name: 'Draft a reply' }));
      expect(await screen.findByText('Draft a reply to Meridian')).toBeInTheDocument();
      expect(await screen.findByText('You asked: Draft a reply to Meridian')).toBeInTheDocument();
      // Only the answer that looked something up says what it was based on.
      expect(screen.getAllByText(/^Based on:/)).toHaveLength(1);
      expect(chats).toHaveLength(2);
      expect(chats[1]).toBe(chats[0]);
      // Only the new chat's first question gives it an address.
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      server.events.removeAllListeners();
    });

    it('explains a failure and asks again', async () => {
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('This will fail');
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Scio couldn’t reach the AI service.');
      await userEvent.click(within(alert).getByRole('button', { name: 'Ask again' }));
      await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    });

    /** A Scio answer that sends these events and then keeps working until stopped. */
    const working = (events: object[]) =>
      server.use(
        http.post('/api/scio/chat', ({ request }) => {
          const stream = new ReadableStream({
            start(controller) {
              const text = events.map((e) => `${JSON.stringify(e)}\n`).join('');
              controller.enqueue(new TextEncoder().encode(text));
              request.signal.addEventListener('abort', () =>
                controller.error(new Error('aborted')),
              );
            },
          });
          return new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
        }),
      );

    it('lists its steps as it works: done ones ticked, the current one loading', async () => {
      working([
        { type: 'step', id: 'a', label: 'Checking new briefs…', status: 'running' },
        { type: 'step', id: 'a', label: 'Found 6 new briefs', status: 'done' },
        { type: 'step', id: 'b', label: 'Opening the brief…', status: 'running' },
      ]);
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('Open the coffee brief');
      const steps = await screen.findByRole('region', { name: 'What Scio is doing' });
      await expectNoAxeViolations(steps);
      const rows = within(steps).getAllByRole('listitem');
      expect(rows.map((r) => r.getAttribute('data-status'))).toEqual(['done', 'running']);
      expect(rows[0]).toHaveTextContent('Found 6 new briefs');
      expect(within(steps).getByTitle('Done')).toBeInTheDocument();
      expect(rows[1]).toHaveTextContent('Opening the brief…');

      // Folded down to the current step, and back.
      await userEvent.click(within(steps).getByRole('button', { name: 'Hide steps' }));
      expect(within(steps).getAllByRole('listitem')).toHaveLength(1);
      await userEvent.click(
        within(steps).getByRole('button', { name: 'Show all steps (1 of 2 done)' }),
      );
      expect(within(steps).getAllByRole('listitem')).toHaveLength(2);
    });

    it('shows its plan, with steps not started yet, and says when it’s writing', async () => {
      working([
        {
          type: 'plan',
          items: [
            { label: 'Open both briefs', status: 'done' },
            { label: 'Compare urgency', status: 'done' },
            { label: 'Draft the email', status: 'pending' },
          ],
        },
        { type: 'token', text: 'The cold-chain brief is more urgent.' },
      ]);
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('Compare the cold-chain and KYC briefs');
      const steps = await screen.findByRole('region', { name: 'What Scio is doing' });
      const rows = within(steps).getAllByRole('listitem');
      expect(rows.map((r) => r.getAttribute('data-status'))).toEqual([
        'done',
        'done',
        'pending',
        // Nothing in the plan is under way, but the answer is coming in.
        'running',
      ]);
      expect(rows[0]).toHaveTextContent('Open both briefs');
      expect(rows[2]).toHaveTextContent('Draft the email: not started');
      expect(rows[3]).toHaveTextContent('Writing the answer…');
    });

    it('can be stopped while it works', async () => {
      server.use(
        http.post('/api/scio/chat', ({ request }) => {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  `${JSON.stringify({ type: 'step', label: 'Checking new briefs…' })}\n`,
                ),
              );
              request.signal.addEventListener('abort', () =>
                controller.error(new Error('aborted')),
              );
            },
          });
          return new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
        }),
      );
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await ask('What new briefs do we have?');
      const steps = await screen.findByRole('region', { name: 'What Scio is doing' });
      expect(within(steps).getByRole('listitem')).toHaveTextContent('Checking new briefs…');
      await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
      expect(await screen.findByText(/Stopped\./)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ask again' })).toBeInTheDocument();
    });

    it('reopens a saved chat from its address and carries on in it', async () => {
      seedScioChat({
        id: 'chat_saved_coffee',
        title: 'Coffee brief summary',
        updatedAt: '2026-11-16T09:00:00Z',
        messages: [
          {
            role: 'user',
            text: 'Open the coffee brief',
            result: null,
            createdAt: '2026-11-16T09:00:00Z',
          },
          {
            role: 'assistant',
            text: 'Meridian Capital wants **3-5 experts**.',
            createdAt: '2026-11-16T09:00:05Z',
            result: {
              id: 'scio_saved',
              text: 'Meridian Capital wants **3-5 experts**.',
              links: [],
              basis: 'Sample briefs (demo mailbox)',
              blocks: [],
              chips: [{ label: 'Draft a reply', prompt: 'Draft a reply to Meridian', href: null }],
              conversation: { id: 'chat_saved_coffee', title: 'Coffee brief summary' },
            },
          },
        ],
      });
      mockLocation.pathname = '/admin/home/chat/chat_saved_coffee';
      const chats = captureChats();
      renderWithProviders(<AdminHome />, { persona: 'ops' });

      expect(
        await screen.findByText(paragraph(/Meridian Capital wants 3-5 experts/)),
      ).toBeInTheDocument();
      expect(screen.getByText('Open the coffee brief')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Hey Umer/ })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Draft a reply' }));
      expect(await screen.findByText('You asked: Draft a reply to Meridian')).toBeInTheDocument();
      expect(chats).toEqual(['chat_saved_coffee']);
      expect(mockRouter.replace).not.toHaveBeenCalled();
      server.events.removeAllListeners();
    });

    it('says when a saved chat is gone', async () => {
      mockLocation.pathname = '/admin/home/chat/chat_missing_one';
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      expect(await screen.findByText('This chat doesn’t exist any more')).toBeInTheDocument();
    });
  });
});
