import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { Booked } from './Booked';
import { ClientPick } from './ClientPick';
import { SyncExperts } from './SyncExperts';

const THREE = ['exp_4821', 'exp_4001', 'exp_4002'];
const json = { 'Content-Type': 'application/json' };

function signIn() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
}

/** Screens 09 → 10: confirm three experts' times and send them to the client, who replies. */
async function sendToClient() {
  signIn();
  const availability = await fetch(
    `/api/admin/projects/PRJ-1042/availability?experts=${THREE.join(',')}`,
  ).then((r) => r.json() as Promise<{ experts: { expertId: string; slots: { id: string }[] }[] }>);
  await fetch('/api/admin/projects/PRJ-1042/availability', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      action: 'prepare_client',
      holdSlots: true,
      experts: availability.experts.map((e) => ({
        expertId: e.expertId,
        slotIds: e.slots.map((s) => s.id),
      })),
    }),
  });
  const draft = await fetch('/api/admin/projects/PRJ-1042/client-draft').then(
    (r) => r.json() as Promise<{ subject: string; intro: string; settings: unknown }>,
  );
  await fetch('/api/admin/projects/PRJ-1042/client-draft', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      action: 'send',
      subject: draft.subject,
      intro: draft.intro,
      expertIds: THREE,
      settings: draft.settings,
    }),
  });
}

async function post(body: unknown) {
  await fetch('/api/admin/projects/PRJ-1042/booking', {
    method: 'POST',
    headers: json,
    body: JSON.stringify(body),
  });
}

describe('Booking (F15, screens 11–13)', () => {
  it('waits for the client’s reply before showing picks', async () => {
    signIn();
    renderWithProviders(<ClientPick projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findByText('Jenna hasn’t replied yet')).toBeInTheDocument();
  });

  it('puts the client’s reply in the inbox', async () => {
    await sendToClient();
    const reply = db.get().adminInbox['req_reply_PRJ-1042'];
    expect(reply?.status).toBe('client_reply');
    expect(reply?.body).toMatch(/I choose Expert A on .* and Expert B on /);
  });

  it('rebuilds the picks when the reply is in the inbox but the booking is missing', async () => {
    await sendToClient();
    db.update((draft) => {
      draft.adminBooking = {};
    });
    renderWithProviders(<ClientPick projectId="PRJ-1042" />, { persona: 'ops' });
    expect(
      await screen.findByRole('heading', { name: 'Jenna picked 2 experts' }),
    ).toBeInTheDocument();
  });

  it('shows the picks and syncs with the experts', async () => {
    await sendToClient();
    const { container } = renderWithProviders(<ClientPick projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', { name: 'Jenna picked 2 experts' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Jake Morrison')).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByLabelText(/Derek Hall/));
    await userEvent.click(screen.getByRole('button', { name: 'Sync with experts' }));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/projects/PRJ-1042/sync'),
    );
    const booking = db.get().adminBooking['PRJ-1042'];
    expect(booking?.stage).toBe('synced');
    expect(booking?.notPicked[0]?.standby).toBe(false);
  });

  it('drafts the message, makes it shorter and locks the project', async () => {
    await sendToClient();
    await post({ action: 'sync', standbyIds: ['exp_4002'] });
    const { container } = renderWithProviders(<SyncExperts projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', { name: 'Tell Jenna the calls are locked' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Confirmed /)).toHaveLength(2);
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Shorter' }));
    expect(screen.getByLabelText('Opening')).toHaveValue('Hi Jenna, your calls are locked:');
    await userEvent.click(screen.getByRole('button', { name: 'Send to Jenna & lock project' }));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/projects/PRJ-1042/booking'),
    );
    expect(db.get().adminBooking['PRJ-1042']?.stage).toBe('booked');
  });

  it('shows the booked calls, the checklist and switches the briefing', async () => {
    await sendToClient();
    await post({ action: 'sync', standbyIds: [] });
    const booking = db.get().adminBooking['PRJ-1042']!;
    await post({
      action: 'lock',
      message: {
        subject: booking.message.subject,
        intro: booking.message.intro,
        closing: booking.message.closing,
        attachInvites: true,
        revealNames: true,
      },
    });
    const { container } = renderWithProviders(<Booked projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(await screen.findByText('Project locked · v1.0')).toBeInTheDocument();
    expect(screen.getByText(/5 of 7 done automatically/)).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: /Jake Morrison/ }));
    expect(screen.getByRole('heading', { name: 'Call with Jake Morrison' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Briefing pack for Jake' })).toBeInTheDocument();
  });
});
