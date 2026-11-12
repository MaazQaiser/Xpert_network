import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { db, server, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { AdminHome } from './AdminHome';

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

  it('answers a suggested question with the progress of every project', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Share progress of all projects' }),
    );
    expect(await screen.findByText(paragraph(/where all 6 projects stand/))).toBeInTheDocument();
    const projects = screen.getByRole('list', { name: 'Projects' });
    const links = within(projects).getAllByRole('link', { name: 'Open project' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/projects/PRJ-1042',
      '/admin/projects/PRJ-1043',
      '/admin/projects/PRJ-1044',
      '/admin/projects/PRJ-1039',
      '/admin/projects/PRJ-1041',
      '/admin/projects/PRJ-1040',
    ]);
  });

  it('new projects card: pick an email, get its brief on a canvas, open the project file', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('link', { name: /New project emails: 3/ }));
    expect(
      await screen.findByText(paragraph(/Here are the 3 new projects that came in today/)),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Hey Umer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Expert reviews ready/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Conversation with your AI assistant' }),
    ).toBeInTheDocument();
    const emails = screen.getByRole('list', { name: 'Emails' });
    expect(within(emails).getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(within(emails).getByRole('button', { name: /Show brief: Amy Wang/ }));
    const canvas = await screen.findByRole('article', { name: /Medical distributors: ERP & EDI/ });
    expect(
      within(canvas).getByText(/Hands-on EDI, eProcurement, API or onboarding work/),
    ).toBeInTheDocument();
    expect(within(canvas).getByRole('link', { name: 'Open project file' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1043/brief',
    );

    // Edit the brief in place; it saves to the project file.
    await userEvent.click(within(canvas).getByRole('button', { name: 'Edit brief' }));
    const brief = within(canvas).getByLabelText('Brief');
    await userEvent.clear(brief);
    await userEvent.type(brief, 'Northgate needs 1–2 calls a month on ERP and EDI integration.');
    await userEvent.click(within(canvas).getByRole('button', { name: 'Save' }));
    expect(
      await within(canvas).findByText(
        /Northgate needs 1–2 calls a month on ERP and EDI integration/,
      ),
    ).toBeInTheDocument();
    expect(db.get().adminProjects['PRJ-1043']?.brief).toMatch(/^Northgate needs 1–2 calls/);
  });

  it('finds experts from the brief, sends several the questions, then extends the search', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('link', { name: /New project emails: 3/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Show brief: Amy Wang/ }));
    expect(
      await screen.findByRole('article', { name: /Medical distributors: ERP & EDI/ }),
    ).toBeInTheDocument();
    // Under the brief the AI asks to create the project file; the AI confirms and offers the next step.
    expect(screen.getByText(paragraph(/Create .+ from this brief/))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    // The AI creates the file in the open, then hands over the project and its requirements.
    expect(await screen.findByText(/Creating the project file/)).toBeInTheDocument();
    expect(await screen.findByText(/is created/, {}, { timeout: 6_000 })).toBeInTheDocument();
    expect(screen.queryByText(/Creating the project file/)).toBeNull();
    expect(db.get().adminProjects['PRJ-1043']?.status).toBe('matching');
    const reqs = screen.getByRole('article', { name: 'Requirements for PRJ-1043' });
    expect(
      within(reqs).getByText(/Hands-on EDI, eProcurement, API or onboarding work/),
    ).toBeInTheDocument();
    expect(within(reqs).getByText(/6 expert\s+requirements/)).toBeInTheDocument();
    expect(within(reqs).queryByText(/screening questions/)).toBeNull();
    // The requirements edit in place, from the pencil at the card's top right.
    await userEvent.click(within(reqs).getByRole('button', { name: 'Edit requirements' }));
    const field = within(reqs).getByRole('textbox', { name: 'Expert requirements' });
    await userEvent.type(field, '{End}{Enter}Speaks English fluently');
    await userEvent.click(within(reqs).getByRole('button', { name: 'Save' }));
    expect(await within(reqs).findByText('Speaks English fluently')).toBeInTheDocument();
    const findButtons = screen.getAllByRole('button', { name: 'Find experts' });
    await userEvent.click(findButtons[findButtons.length - 1]!);

    // The AI works in the open, then the top 10 arrive ranked.
    expect(
      await screen.findByText(paragraph(/Searching the system’s expert listing/)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'heading',
        { name: /These are the top 10 experts for Medical distributors: ERP & EDI/ },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    const ranked = screen.getByRole('table', { name: 'Ranked experts' });
    // A header row, then one row per expert.
    expect(within(ranked).getAllByRole('row')).toHaveLength(11);
    // No Expertise column: a row opens the expert's profile in the side panel instead.
    expect(within(ranked).queryByRole('columnheader', { name: 'Expertise' })).toBeNull();
    const [firstName] = within(ranked).getAllByRole('button', { name: /^Open .*’s profile$/ });
    await userEvent.click(firstName!);
    const profile = await screen.findByRole('dialog', { name: /’s profile$/ });
    // The AI's reasons sit behind the mascot, shown on hover or focus.
    expect(
      within(profile).getByRole('button', { name: /^Why the AI picked / }),
    ).toBeInTheDocument();
    expect(within(profile).getByText('1 of 10')).toBeInTheDocument();
    // Their LinkedIn-style experience, and a button (not a toggle) to pick them.
    expect(within(profile).getByRole('heading', { name: 'Experience' })).toBeInTheDocument();
    expect(within(profile).queryByText('Compliance')).toBeNull();
    await userEvent.click(within(profile).getByRole('button', { name: 'Select for screening' }));
    expect(within(profile).getByRole('button', { name: 'Selected' })).toBeInTheDocument();
    await userEvent.click(within(profile).getByRole('button', { name: 'Selected' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Pick two and send them the screening questions together.
    await userEvent.click(
      within(ranked).getAllByRole('checkbox', { name: /^Select .* rank 1,/ })[0]!,
    );
    await userEvent.click(
      within(ranked).getAllByRole('checkbox', { name: /^Select .* rank 2,/ })[0]!,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send screening questions to 2' }));
    // Sent: the AI says it'll report back, and invites any other question meanwhile.
    expect(await screen.findByText(/I’m getting their answers/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review other items' })).toBeInTheDocument();
    expect(db.get().adminScreening['PRJ-1043']).toHaveLength(2);

    // Not enough? Extend the research from a card in the thread.
    await userEvent.click(screen.getByRole('button', { name: 'Extend research with AI' }));
    const card = screen.getByRole('article', { name: 'Extend research' });
    // One question at a time: search size, then knowledge, then a preview.
    expect(
      within(card).getByRole('heading', { name: /How many more experts/ }),
    ).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Next' }));
    expect(
      within(card).getByRole('heading', { name: /What should they know/ }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', {
        name: 'Remove Hands-on EDI, eProcurement, API or onboarding work',
      }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('textbox', { name: 'Knowledge the experts need' }),
    ).toBeInTheDocument();
    expect(within(card).getByRole('checkbox', { name: 'LinkedIn' })).toBeChecked();
    expect(within(card).getByRole('checkbox', { name: 'Expert network API' })).toBeChecked();
    await userEvent.click(within(card).getByRole('button', { name: 'Preview' }));
    expect(within(card).getByText(/5–10 more, with 10\+ years/)).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Done, find experts' }));
    expect(screen.getByText(/Find 5–10 more experts with 10\+ years/)).toBeInTheDocument();
    // The search runs on its own; the PM can leave and look at other work.
    const extended = screen.getByRole('region', { name: 'Extended search' });
    expect(within(extended).getByRole('status')).toHaveTextContent(/I’m finding more experts/);
    expect(
      within(extended).getByRole('button', { name: 'Review other tasks' }),
    ).toBeInTheDocument();
    // This chat stops here: the search keeps loading, and the new experts are not listed.
    expect(
      await within(extended).findByText('Finding more experts…', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(within(extended).queryByRole('table')).toBeNull();
    expect(within(extended).queryByText(/The new experts are in/)).toBeNull();

    // A few seconds on, a toast says the first expert answered; the chat has no link of its own.
    const toast = await screen.findByRole(
      'button',
      { name: /answered the screening questions/ },
      { timeout: 10_000 },
    );
    expect(screen.queryByRole('button', { name: /View screening answers/ })).toBeNull();

    // Clicking it opens that expert's answers in the chat: the AI looks, then lists who answered.
    await userEvent.click(toast);
    expect(await screen.findByText(/Finding .*’s screening answers/)).toBeInTheDocument();
    const answers = await screen.findByRole(
      'table',
      { name: 'Experts who answered' },
      { timeout: 10_000 },
    );
    const [, ...answerRows] = within(answers).getAllByRole('row');
    expect(answerRows).toHaveLength(3);
    expect(within(answers).getByText('LinkedIn')).toBeInTheDocument();

    // An expert's answers open in a side panel: free times first, then every answer.
    const panel = await screen.findByRole('dialog', { name: /’s report$/ }, { timeout: 5_000 });
    // The AI summary sits behind the mascot, as on the expert profile.
    expect(within(panel).getByRole('button', { name: /^AI summary of / })).toBeInTheDocument();
    const answerList = within(panel).getByRole('list', { name: /’s answers$/ });
    expect(within(answerList).getAllByRole('listitem').length).toBeGreaterThan(4);
    const times = within(panel).getByRole('region', { name: /’s free times$/ });
    expect(within(times).getAllByRole('listitem').length).toBeGreaterThan(0);
    // Next steps to the other expert; Esc closes the panel.
    await userEvent.click(within(panel).getByRole('button', { name: 'Next' }));
    expect(within(screen.getByRole('dialog')).getByText('2 of 3')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    // Sending the picks to the client is a later step, not part of reading the answers.
    expect(screen.queryByRole('heading', { name: 'Ready for the client' })).toBeNull();
  }, 40_000);

  it('new project emails card: lists drafted projects from today’s mail', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('link', { name: /New project emails: 3/ }));
    const emails = await screen.findByRole('list', { name: 'Emails' });
    expect(within(emails).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /Show brief: Amy Wang/ })).toBeInTheDocument();
  });

  it('the mascot thinks while loading, rests, then reacts to an answer', async () => {
    const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
    const mascot = () => container.querySelector('[data-mood]');
    expect(mascot()).toHaveAttribute('data-mood', 'thinking');
    await screen.findByRole('link', {
      name: 'Expert reviews ready: 4. Ask the assistant which expert reviews need sign-off',
    });
    expect(mascot()).toHaveAttribute('data-mood', 'idle');
    await userEvent.click(
      screen.getByRole('link', {
        name: 'Expert reviews ready: 4. Ask the assistant which expert reviews need sign-off',
      }),
    );
    expect(await screen.findByText(paragraph(/4 expert answers are waiting/))).toBeInTheDocument();
    expect(mascot()).not.toBeInTheDocument();
  });

  it('reviews answers, sends the profiles, then books the client’s calls', async () => {
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('link', {
        name: 'Expert reviews ready: 4. Ask the assistant which expert reviews need sign-off',
      }),
    );
    const projects = await screen.findByRole('list', {
      name: 'Projects with expert answers to review',
    });
    expect(within(projects).getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(
      within(projects).getByRole('button', {
        name: 'Review answers for Medical distributors: ERP & EDI integration',
      }),
    );

    await screen.findByRole('table', { name: 'Experts who answered' }, { timeout: 10_000 });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Draft the email' })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Draft the email' }));

    await screen.findByRole('button', { name: 'Send to Amy' }, { timeout: 10_000 });
    await userEvent.click(screen.getByRole('button', { name: 'Send to Amy' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Review other tasks' }));

    // Home again: Amy’s reply is the new email, asking to book the calls.
    const reply = await screen.findByRole('button', { name: /Amy Wang replied/ });
    expect(screen.getByRole('heading', { name: /Hey Umer/ })).toBeInTheDocument();
    await userEvent.click(reply);
    expect(await screen.findByText('Amy replied. Book 2 experts.')).toBeInTheDocument();
    expect(screen.queryByText(/req_reply/)).not.toBeInTheDocument();
    expect(await screen.findByText(paragraph(/Should I book the meetings/))).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, book the meetings' }));
    expect(await screen.findByRole('link', { name: 'View your calendar' })).toHaveAttribute(
      'href',
      '/admin/scheduling',
    );
  }, 40_000);

  it('shows an error with retry when the summary fails', async () => {
    setControls({ apiError: true });
    renderWithProviders(<AdminHome />, { persona: 'ops' });
    expect(await screen.findByText('Today’s summary didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  describe('a LinkedIn profile link in the chat', () => {
    const typeInChat = async (text: string) => {
      const field = await screen.findByRole('textbox', { name: 'Ask your AI assistant' });
      await userEvent.type(field, `${text}{Enter}`);
    };

    const captureSend = () => {
      const sent: { path: string; text: string }[] = [];
      server.use(
        http.post(
          '/api/getsales/sender-profiles/:sender/leads/:lead/messages',
          async ({ params, request }) => {
            const { text } = (await request.json()) as { text: string };
            sent.push({ path: `${String(params.sender)}/${String(params.lead)}`, text });
            return HttpResponse.json(
              {
                uuid: 'm_new',
                direction: 'sent',
                text,
                subject: null,
                sentAt: null,
                status: 'in_progress',
                linkedinType: 'message',
                failReason: null,
                read: true,
              },
              { status: 201 },
            );
          },
        ),
      );
      return sent;
    };

    it('shows the profile, and its Send message button sends the edited draft', async () => {
      const sent = captureSend();
      const { container } = renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('https://www.linkedin.com/in/hassan-islam-3bbb98111/');

      const card = await screen.findByRole('article', { name: 'Hassan Islam' });
      expect(within(card).getByText('Senior Software Engineer @Tkxel')).toBeInTheDocument();
      expect(within(card).getByText('2,510')).toBeInTheDocument();
      expect(within(card).getByText('NexTek Solutions')).toBeInTheDocument();
      // The LinkedIn address isn't repeated as a link; View profile opens it.
      expect(within(card).queryByRole('link', { name: /^linkedin\.com/ })).toBeNull();
      expect(within(card).getByRole('link', { name: /View profile/ })).toHaveAttribute(
        'href',
        'https://www.linkedin.com/in/hassan-islam-3bbb98111',
      );

      await userEvent.click(within(card).getByRole('button', { name: 'Send message' }));
      const draft = within(card).getByRole('form', { name: 'Message to Hassan Islam' });
      const field = within(draft).getByLabelText('Message to Hassan');
      // A first message is written for you, short enough for a connection note.
      expect(field).toHaveValue(
        'Hi Hassan, I’m Ateeb from Xpert Network. I came across your profile and would love to connect. Would you be open to a short paid call to share your expertise?',
      );
      // A known connection: a normal message, so no 300-character note limit.
      expect(within(draft).getByText(/as a message/)).toBeInTheDocument();

      await userEvent.clear(field);
      await userEvent.type(field, 'Hi Hassan, could we talk about ERP rollouts?');
      await userEvent.click(within(draft).getByRole('button', { name: 'Send' }));
      expect(await within(card).findByText(/Message sent to Hassan/)).toBeInTheDocument();
      expect(sent).toEqual([
        {
          path: '50181726-f022-4c23-8116-1c45e97f8a19/lead_hassan',
          text: 'Hi Hassan, could we talk about ERP rollouts?',
        },
      ]);
      expect(within(card).getByRole('link', { name: 'Open the conversation' })).toHaveAttribute(
        'href',
        '/admin/inbox?account=sender%3A50181726-f022-4c23-8116-1c45e97f8a19&conversation=lead_hassan',
      );
      await expectNoAxeViolations(container);
    });

    it('opens the draft from a click anywhere on the card', async () => {
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('linkedin.com/in/hassan-islam-3bbb98111');
      const card = await screen.findByRole('article', { name: 'Hassan Islam' });
      await userEvent.click(within(card).getByText('Lahore, Punjab, Pakistan'));
      expect(
        within(card).getByRole('form', { name: 'Message to Hassan Islam' }),
      ).toBeInTheDocument();
    });

    it('sends someone who isn’t a connection a connection request with the note', async () => {
      const messages = captureSend();
      const invites: { path: string; note: string }[] = [];
      server.use(
        http.post(
          '/api/getsales/sender-profiles/:sender/leads/:lead/connect',
          async ({ params, request }) => {
            const { note } = (await request.json()) as { note: string };
            invites.push({ path: `${String(params.sender)}/${String(params.lead)}`, note });
            return HttpResponse.json({ flowUuid: 'flow_1', status: 'queued' }, { status: 201 });
          },
        ),
      );
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('linkedin.com/in/sana-mirza');
      const card = await screen.findByRole('article', { name: 'Sana Mirza' });
      expect(screen.getByText(/Sana isn’t one of your connections yet/)).toBeInTheDocument();
      await userEvent.click(within(card).getByRole('button', { name: 'Send connection request' }));
      const draft = within(card).getByRole('form', { name: 'Message to Sana Mirza' });
      expect(within(draft).getByText(/goes as a connection request/)).toBeInTheDocument();

      // LinkedIn's 300 characters for a note: the field stops there.
      const field = within(draft).getByLabelText('Note to Sana');
      await userEvent.clear(field);
      await userEvent.click(field);
      await userEvent.paste('x'.repeat(400));
      expect((field as HTMLTextAreaElement).value).toHaveLength(300);

      await userEvent.clear(field);
      await userEvent.type(field, 'Hi Sana, would love to connect.');
      await userEvent.click(within(draft).getByRole('button', { name: 'Send connection request' }));
      expect(
        await within(card).findByText(/Connection request on its way to Sana/),
      ).toBeInTheDocument();
      expect(invites).toEqual([
        {
          path: '50181726-f022-4c23-8116-1c45e97f8a19/lead_sana',
          note: 'Hi Sana, would love to connect.',
        },
      ]);
      // Not a plain message: LinkedIn would refuse it.
      expect(messages).toHaveLength(0);
    });

    it('keeps the draft and explains when the send fails', async () => {
      server.use(
        http.post('/api/getsales/sender-profiles/:sender/leads/:lead/connect', () =>
          HttpResponse.json(
            { code: 'rejected', message: 'Connection requests are turned off for this sender.' },
            { status: 400 },
          ),
        ),
      );
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('linkedin.com/in/sana-mirza');
      const card = await screen.findByRole('article', { name: 'Sana Mirza' });
      await userEvent.click(within(card).getByRole('button', { name: 'Send connection request' }));
      const draft = within(card).getByRole('form', { name: 'Message to Sana Mirza' });
      await userEvent.click(within(draft).getByRole('button', { name: 'Send connection request' }));
      expect(
        await within(card).findByText('Connection requests are turned off for this sender.'),
      ).toBeInTheDocument();
      expect(within(draft).getByRole('button', { name: 'Send connection request' })).toBeEnabled();
    });

    it('says a connection request is already out instead of offering another', async () => {
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('linkedin.com/in/umar-sarwar');
      const card = await screen.findByRole('article', { name: 'Umar Sarwar' });
      expect(screen.getByText(/You’ve already asked Umar to connect/)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Connection request sent' })).toBeDisabled();
      // Clicking the card doesn't open a draft either.
      await userEvent.click(within(card).getByText('SEO Team Lead @ Tkxel'));
      expect(within(card).queryByRole('form')).toBeNull();
    });

    it('waits for the connection status of someone just added before offering anything', async () => {
      const justAdded = {
        uuid: 'lead_shahzad',
        name: 'Shahzad Cheema',
        headline: 'Chief AI Officer',
        position: null,
        company: null,
        location: null,
        avatarUrl: null,
        linkedinUrl: 'https://www.linkedin.com/in/muhammadshahzadcheema',
        connections: null,
        followers: null,
        premium: false,
        openProfile: false,
        about: null,
        experience: [],
        enriched: true,
        // GetSales hasn't attached his connection status yet.
        settled: false,
        connectedSenderUuids: [],
        requestedSenderUuids: [],
      };
      server.use(
        http.post('/api/getsales/leads/lookup', () => HttpResponse.json(justAdded)),
        http.get('/api/getsales/leads/:uuid', () => HttpResponse.json(justAdded)),
      );
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('linkedin.com/in/muhammadshahzadcheema');
      const card = await screen.findByRole('article', { name: 'Shahzad Cheema' });
      expect(
        screen.getByText(/Checking whether you’re connected with Shahzad/),
      ).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Checking connection…' })).toBeDisabled();
      expect(within(card).queryByRole('button', { name: 'Send connection request' })).toBeNull();
      await userEvent.click(within(card).getByText('Chief AI Officer'));
      expect(within(card).queryByRole('form')).toBeNull();
    });

    it('explains a failed lookup and lets you try again', async () => {
      renderWithProviders(<AdminHome />, { persona: 'ops' });
      await typeInChat('https://www.linkedin.com/in/someone-unknown');
      expect(await screen.findByText('LinkedIn messaging isn’t responding.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Look it up again' })).toBeInTheDocument();
    });
  });
});
