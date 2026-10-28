import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { CallReview } from './CallReview';
import { Calls } from './Calls';

/** The id of a completed call, read from the Calls list as a PM would click it. */
async function completedCallId(): Promise<string> {
  const { unmount } = renderWithProviders(<Calls />, { persona: 'ops' });
  await userEvent.click(await screen.findByRole('tab', { name: /^Completed/ }));
  const [link] = screen.getAllByRole('link', { name: /×/ });
  const id = link!.getAttribute('href')!.split('/').at(-1)!;
  unmount();
  return id;
}

describe('Calls (F16)', () => {
  it('shows the live call on top, then upcoming and completed calls', async () => {
    const { container } = renderWithProviders(<Calls />, { persona: 'ops' });
    const live = await screen.findByRole('article', { name: /^Live now: / });
    expect(within(live).getByRole('link', { name: /Join with Google Meet/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/meet\.google\.com\//),
    );
    expect(within(live).getByRole('link', { name: 'Follow live notes' })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    // Completed calls show whether their report went out; the tab opens on them while some haven't.
    await userEvent.click(screen.getByRole('tab', { name: /^Completed/ }));
    expect(screen.getAllByText('Report to send').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: /^Upcoming/ }));
    expect(
      screen.getAllByRole('link', { name: /^Join .* with Google Meet/ }).length,
    ).toBeGreaterThan(0);

    // Search narrows the list.
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search calls' }), 'zzz');
    expect(screen.queryByRole('article', { name: /^Live now: / })).toBeNull();
    expect(screen.getByText('No upcoming calls match your search.')).toBeInTheDocument();
  });

  it('reviews a completed call: summary, transcript, and the call report', async () => {
    const callId = await completedCallId();
    const { container } = renderWithProviders(<CallReview callId={callId} />, { persona: 'ops' });
    expect(await screen.findByRole('heading', { name: /×/, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Key takeaways')).toBeInTheDocument();
    expect(screen.getByText(/^\d of \d covered$/)).toBeInTheDocument();
    await expectNoAxeViolations(container);

    // A transcript line's time moves the player there.
    await userEvent.click(screen.getByRole('tab', { name: 'Transcript' }));
    const transcript = screen.getByRole('list', { name: 'Transcript' });
    const times = within(transcript).getAllByRole('button');
    await userEvent.click(times[2]!);
    const [minutes, seconds] = times[2]!.textContent!.split(':').map(Number);
    expect(screen.getByRole('slider', { name: 'Position in the recording' })).toHaveValue(
      String(minutes! * 60 + seconds!),
    );

    // The email to the client goes out in one click.
    // The report: every question with the expert's answer, and a source that plays it back.
    await userEvent.click(screen.getByRole('tab', { name: 'Report' }));
    const report = screen.getByRole('article', { name: /, / });
    expect(
      within(report).getByRole('heading', { name: 'What the client asked' }),
    ).toBeInTheDocument();
    const [source] = within(report).getAllByRole('button', { name: /^Play the recording from / });
    await userEvent.click(source!);
    expect(screen.getByRole('slider', { name: 'Position in the recording' })).not.toHaveValue('0');
    await userEvent.click(screen.getByRole('button', { name: /^Send to / }));
    expect(await screen.findByRole('status')).toHaveTextContent(/^Report sent to /);
    // The button stays, so the report can go again.
    expect(screen.getByRole('button', { name: /^Send to / })).toBeEnabled();
  });

  it('opens a live call on its live transcript', async () => {
    renderWithProviders(<CallReview callId="mtg_live" />, { persona: 'ops' });
    expect(await screen.findByText('Live transcript')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Transcript', selected: true })).toBeInTheDocument();
    const transcript = screen.getByRole('list', { name: 'Transcript' });
    expect(transcript).toHaveAttribute('aria-live', 'polite');
    // No recording yet, so times are plain text, not jumps.
    expect(within(transcript).queryAllByRole('button')).toHaveLength(0);
    expect(within(transcript).getByText('Just now')).toBeInTheDocument();
    expect(screen.getByText('Listening…')).toBeInTheDocument();
  });

  it('shows an empty state with no calls, and an error with retry', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<Calls />, { persona: 'ops' });
    expect(await screen.findByText('No calls yet')).toBeInTheDocument();
    unmount();
    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<Calls />, { persona: 'ops' });
    expect(await screen.findByText('Your calls didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
