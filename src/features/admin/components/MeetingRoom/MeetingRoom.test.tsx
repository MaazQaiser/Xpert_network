import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { MeetingRoom } from './MeetingRoom';

describe('Meeting room', () => {
  it('lets you check your camera and mic, then join the call', async () => {
    renderWithProviders(<MeetingRoom callId="mtg_live" />, { persona: 'ops' });
    const join = await screen.findByRole('button', { name: 'Join now' });
    expect(screen.getByText(/are in the call\./)).toBeInTheDocument();

    // Mic off in the lobby stays off in the call.
    await userEvent.click(screen.getByRole('button', { name: 'Mic on' }));
    expect(screen.getByRole('button', { name: 'Mic off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await userEvent.click(join);

    const controls = screen.getByRole('navigation', { name: 'Call controls' });
    expect(within(controls).getByRole('button', { name: 'Muted' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('figure', { name: /^Nathan|^Megan|, speaking/ })).toBeInTheDocument();
    // The AI's notes are open: the client's questions, ticked as covered.
    expect(screen.getByRole('complementary', { name: 'AI notes' })).toBeInTheDocument();
    await expectNoAxeViolations(controls.closest('.cds--g100') as HTMLElement);
  }, 15_000);

  it('chats, and raises a hand', async () => {
    renderWithProviders(<MeetingRoom callId="mtg_live" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Join now' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chat' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Message everyone' }), 'Welcome both');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText('Welcome both')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Raise' }));
    expect(screen.getAllByLabelText('Hand raised').length).toBeGreaterThan(0);
  });

  it('sends you to the review when the call has ended', async () => {
    renderWithProviders(<MeetingRoom callId="mtg_PRJ-1039_0" />, { persona: 'ops' });
    expect(await screen.findByText('This call has ended')).toBeInTheDocument();
  });
});
