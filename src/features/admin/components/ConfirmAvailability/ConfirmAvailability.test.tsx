import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ConfirmAvailability } from './ConfirmAvailability';

const FIVE = ['exp_4821', 'exp_4001', 'exp_4002', 'exp_4003', 'exp_4004'];

function signIn() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
}

describe('ConfirmAvailability (F15, screen 09)', () => {
  it('points back to the screening answers when no experts were chosen', async () => {
    signIn();
    renderWithProviders(<ConfirmAvailability projectId="PRJ-1042" expertIds={[]} />, {
      persona: 'ops',
    });
    expect(await screen.findByText('No experts chosen yet')).toBeInTheDocument();
  });

  it('shows the counts, offered times and who goes to the client', async () => {
    signIn();
    const { container } = renderWithProviders(
      <ConfirmAvailability projectId="PRJ-1042" expertIds={FIVE} />,
      { persona: 'ops' },
    );
    expect(
      await screen.findByRole('heading', { name: 'Confirm availability' }),
    ).toBeInTheDocument();
    expect(screen.getByText('04 / 05')).toBeInTheDocument();
    expect(screen.getByText('Compliance form not signed')).toBeInTheDocument();
    expect(screen.getByText('Expert A · Thru-hiker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send 5 experts to the client' })).toBeEnabled();
    await expectNoAxeViolations(container);
  });

  it('leaves out an expert whose slots are all deselected', async () => {
    signIn();
    renderWithProviders(<ConfirmAvailability projectId="PRJ-1042" expertIds={FIVE} />, {
      persona: 'ops',
    });
    const times = await screen.findByRole('group', { name: 'Expert #4821’s times' });
    for (const tag of within(times).getAllByRole('button')) await userEvent.click(tag);
    expect(screen.getByRole('button', { name: 'Send 4 experts to the client' })).toBeEnabled();
  });

  it('resends the compliance form and messages an expert', async () => {
    signIn();
    renderWithProviders(<ConfirmAvailability projectId="PRJ-1042" expertIds={FIVE} />, {
      persona: 'ops',
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Resend compliance form' }));
    expect(
      await screen.findByText('Compliance form sent again to Expert #4003.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Message' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: /Message Expert #4821/ });
    await userEvent.type(
      within(dialog).getByLabelText('Message'),
      'Can you do 30 minutes earlier?',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Message sent to Expert #4821.')).toBeInTheDocument();
    expect(db.get().adminMail).toHaveLength(2);
  });

  it('prepares the client email and opens it', async () => {
    signIn();
    renderWithProviders(<ConfirmAvailability projectId="PRJ-1042" expertIds={FIVE} />, {
      persona: 'ops',
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Send 5 experts to the client' }),
    );
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/projects/PRJ-1042/client'),
    );
    expect(db.get().adminClientDraft['PRJ-1042']?.experts).toHaveLength(5);
    // Nothing is emailed until the PM sends it from the next screen.
    expect(db.get().adminMail).toHaveLength(0);
  });

  it('leads on to the client’s picks once the experts were sent', async () => {
    signIn();
    const availability = await fetch(
      `/api/admin/projects/PRJ-1042/availability?experts=${FIVE.join(',')}`,
    ).then(
      (r) =>
        r.json() as Promise<{
          experts: { expertId: string; status: string; slots: { id: string }[] }[];
        }>,
    );
    await fetch('/api/admin/projects/PRJ-1042/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare_client',
        holdSlots: true,
        experts: availability.experts
          .filter((e) => e.status === 'confirmed')
          .map((e) => ({ expertId: e.expertId, slotIds: e.slots.map((s) => s.id) })),
      }),
    });
    const draft = await fetch('/api/admin/projects/PRJ-1042/client-draft').then(
      (r) =>
        r.json() as Promise<{
          subject: string;
          intro: string;
          settings: unknown;
          experts: { expertId: string }[];
        }>,
    );
    await fetch('/api/admin/projects/PRJ-1042/client-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        subject: draft.subject,
        intro: draft.intro,
        expertIds: draft.experts.map((e) => e.expertId),
        settings: draft.settings,
      }),
    });
    renderWithProviders(<ConfirmAvailability projectId="PRJ-1042" expertIds={FIVE} />, {
      persona: 'ops',
    });
    expect(await screen.findByRole('link', { name: 'Open Jenna’s picks' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/pick',
    );
  });
});
