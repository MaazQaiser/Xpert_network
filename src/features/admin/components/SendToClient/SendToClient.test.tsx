import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { SendToClient } from './SendToClient';

const THREE = ['exp_4821', 'exp_4001', 'exp_4002'];

/** Confirms three experts' times on screen 09, which drafts the client email. */
async function prepareDraft() {
  db.update((draft) => {
    draft.sessionUserId = 'usr_ops';
  });
  const availability = await fetch(
    `/api/admin/projects/PRJ-1042/availability?experts=${THREE.join(',')}`,
  ).then((r) => r.json() as Promise<{ experts: { expertId: string; slots: { id: string }[] }[] }>);
  await fetch('/api/admin/projects/PRJ-1042/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare_client',
      holdSlots: true,
      experts: availability.experts.map((e) => ({
        expertId: e.expertId,
        slotIds: e.slots.map((s) => s.id),
      })),
    }),
  });
}

describe('SendToClient (F15, screen 10)', () => {
  it('points back to confirm availability when there is no draft', async () => {
    db.update((draft) => {
      draft.sessionUserId = 'usr_ops';
    });
    renderWithProviders(<SendToClient projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findByText('No experts are ready to send yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to confirm availability' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/availability',
    );
  });

  it('shows the AI-drafted email, settings and question coverage', async () => {
    await prepareDraft();
    const { container } = renderWithProviders(<SendToClient projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      /^Send 3 experts to /,
    );
    expect(screen.getByRole('img', { name: 'AI drafted' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Experts in the email' });
    expect(list.querySelectorAll(':scope > li')).toHaveLength(3);
    expect(screen.getByLabelText('Hide expert names until booked')).toBeChecked();
    expect(screen.getByText(/Q1 · Market size/)).toBeInTheDocument();
    expect(screen.queryByText('Not covered')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('flags uncovered questions when an expert is removed', async () => {
    await prepareDraft();
    renderWithProviders(<SendToClient projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove Lukas Brandt from the email' }),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Send 2 experts/);
    expect(screen.getAllByText('Not covered').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Bring back removed experts' }));
    expect(screen.queryByText('Not covered')).not.toBeInTheDocument();
  });

  it('blocks sending without a subject, then sends the email', async () => {
    await prepareDraft();
    renderWithProviders(<SendToClient projectId="PRJ-1042" />, { persona: 'ops' });
    const subject = await screen.findByLabelText('Subject');
    const send = screen.getByRole('button', { name: /^Send to / });
    await userEvent.clear(subject);
    expect(send).toBeDisabled();
    expect(screen.getByText('Add a subject.')).toBeInTheDocument();
    await userEvent.type(subject, 'Experts for your battery recycling project');
    await userEvent.click(send);
    expect(await screen.findByText(/^Sent at /)).toBeInTheDocument();
    expect(db.get().adminMail).toHaveLength(1);
    expect(db.get().adminClientDraft['PRJ-1042']?.sentAt).not.toBeNull();
  });
});
