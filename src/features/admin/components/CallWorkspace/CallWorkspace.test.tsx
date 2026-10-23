import { describe, expect, it } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { CallWorkspace } from './CallWorkspace';

const THREE = ['exp_4821', 'exp_4001', 'exp_4002'];
const json = { 'Content-Type': 'application/json' };
const post = (path: string, body: unknown) =>
  fetch(`/api/admin/projects/PRJ-1042/${path}`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(body),
  });

/** Screens 09 → 13: send three experts, sync the client's picks and lock the project. */
async function bookCalls() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
  const availability = await fetch(
    `/api/admin/projects/PRJ-1042/availability?experts=${THREE.join(',')}`,
  ).then((r) => r.json() as Promise<{ experts: { expertId: string; slots: { id: string }[] }[] }>);
  await post('availability', {
    action: 'prepare_client',
    holdSlots: true,
    experts: availability.experts.map((e) => ({
      expertId: e.expertId,
      slotIds: e.slots.map((s) => s.id),
    })),
  });
  const draft = await fetch('/api/admin/projects/PRJ-1042/client-draft').then(
    (r) => r.json() as Promise<{ subject: string; intro: string; settings: unknown }>,
  );
  await post('client-draft', {
    action: 'send',
    subject: draft.subject,
    intro: draft.intro,
    expertIds: THREE,
    settings: draft.settings,
  });
  await post('booking', { action: 'sync', standbyIds: [] });
  const booking = db.get().adminBooking['PRJ-1042']!;
  await post('booking', {
    action: 'lock',
    message: {
      subject: booking.message.subject,
      intro: booking.message.intro,
      closing: booking.message.closing,
      attachInvites: true,
      revealNames: true,
    },
  });
}

/** The ended call shows the whole transcript and every request. */
async function endCall() {
  await fetch('/api/admin/projects/PRJ-1042/call');
  await post('call', { action: 'end', duration: 1935 });
}

describe('CallWorkspace (F16, screen 14)', () => {
  it('waits until a call is booked', async () => {
    db.update((draft) => {
      draft.sessionUserId = 'usr_ops';
    });
    renderWithProviders(<CallWorkspace projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findByText('No call is booked yet')).toBeInTheDocument();
  });

  it('plays the live transcript with the call controls', async () => {
    await bookCalls();
    const { container } = renderWithProviders(<CallWorkspace projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Call time' })).toHaveTextContent('00:20:52');
    expect(screen.getByRole('button', { name: 'Send all to client' })).toBeDisabled();
    await expectNoAxeViolations(container);
  });

  it('acts on the client’s requests and updates the questions', async () => {
    await bookCalls();
    await endCall();
    renderWithProviders(<CallWorkspace projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findByText('Client requests detected · 3')).toBeInTheDocument();
    expect(screen.getByText('5 / 8')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByText('Removed · project file v1.1')).toBeInTheDocument();
    expect(screen.getByText('5 / 7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Generate after call' }));
    const after = screen.getByRole('region', { name: 'After the call' });
    expect(await within(after).findByText('Updated project file v1.1')).toBeInTheDocument();
    expect(within(after).getByText('Lukas’s bio (anonymised)')).toBeInTheDocument();
  });

  it('ends the call, then sends the documents and pays the expert', async () => {
    await bookCalls();
    renderWithProviders(<CallWorkspace projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'End call' }));
    const dialog = await screen.findByRole('dialog', { name: /End the call/ });
    await act(() => userEvent.click(within(dialog).getByRole('button', { name: 'End call' })));
    // The call-ended moment: the mascot, a note, and a way home or back to the call.
    const ended = await screen.findByRole('dialog', { name: 'Your call has ended' });
    expect(within(ended).getByRole('link', { name: 'Go to Home' })).toHaveAttribute(
      'href',
      '/admin/home',
    );
    expect(within(ended).getByRole('link', { name: 'Go to Home' })).toHaveFocus();
    await userEvent.click(within(ended).getByRole('button', { name: 'Review the call' }));
    expect(screen.queryByRole('dialog', { name: 'Your call has ended' })).not.toBeInTheDocument();
    expect(screen.getByText('Ended')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Send all to client' }));
    expect(await screen.findByText(/Sent to Sarah at/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark expert paid' }));
    expect(await screen.findByText('Lukas marked paid')).toBeInTheDocument();
    expect(db.get().adminCall['PRJ-1042']?.expertPaidAt).not.toBeNull();
  });
});
