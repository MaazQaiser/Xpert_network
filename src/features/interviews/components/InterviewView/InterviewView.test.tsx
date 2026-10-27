import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db, setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { InterviewView } from './InterviewView';

async function approvedInterview(): Promise<string> {
  db.update((draft) => {
    draft.sessionUserId = 'usr_sara';
  });
  const response = await fetch('/api/calls/call_ksa_coffee_supply/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: {
        sq_sourcing: 'yes',
        sq_role: 'operator',
        sq_context: 'I sourced green coffee for 60 stores in Saudi Arabia.',
      },
    }),
  });
  const call = (await response.json()) as { application: { interviewId: string } };
  return call.application.interviewId;
}

const LONG =
  'For about eight years I ran sourcing for a chain of sixty cafés, buying green coffee from importers.';

describe('Interview room (F9)', () => {
  it('offers text when the microphone is denied, then starts after the compliance check', async () => {
    setControls({ micDenied: true });
    const id = await approvedInterview();
    const { container } = renderWithProviders(<InterviewView interviewId={id} />, {
      persona: 'sara',
    });
    expect(await screen.findByText('We can’t use your microphone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeDisabled();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Answer by text instead' }));
    await userEvent.click(
      screen.getByLabelText('I won’t share confidential or non-public information.'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start interview' }));
    const transcript = await screen.findByRole('list', { name: 'Transcript' });
    expect(
      within(transcript).getByText(/tell me about your role in coffee supply/),
    ).toBeInTheDocument();
  });

  it('answers, skips with a reason and says “can’t answer” in the room', async () => {
    const id = await approvedInterview();
    await fetch(`/api/interviews/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'text', language: 'en', acceptCompliance: true }),
    });
    const { container } = renderWithProviders(<InterviewView interviewId={id} />, {
      persona: 'sara',
    });
    const transcript = await screen.findByRole('list', { name: 'Transcript' });
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect(await screen.findByText('Type your answer first.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Your answer'), LONG);
    await userEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect(await within(transcript).findByText(/Roughly how large/)).toBeInTheDocument();

    const composer = screen.getByRole('form', { name: 'Answer the question' });
    await userEvent.click(within(composer).getByRole('button', { name: 'Skip question' }));
    const dialog = await screen.findByRole('dialog', { name: 'Skip this question?' });
    await userEvent.click(within(dialog).getByLabelText('It’s outside my experience'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Skip question' }));
    expect(
      await within(transcript).findByText('Skipped: It’s outside my experience'),
    ).toBeInTheDocument();
    expect(within(transcript).getByText(/that covers background/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'I can’t answer, it’s confidential' }),
    );
    expect(
      await within(transcript).findByText('No problem at all, we’ll leave that one.'),
    ).toBeInTheDocument();
  });

  it('reviews AI summaries, which can be edited and reverted', async () => {
    const id = await approvedInterview();
    const post = (path: string, body?: unknown) =>
      fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    await post(`/api/interviews/${id}/start`, {
      mode: 'text',
      language: 'en',
      acceptCompliance: true,
    });
    await (
      await post(`/api/interviews/${id}/turn`, { turnId: `${id}-a`, action: 'answer', text: LONG })
    ).text();
    await post(`/api/interviews/${id}/end`);

    const { container } = renderWithProviders(<InterviewView interviewId={id} />, {
      persona: 'sara',
    });
    expect(await screen.findByRole('heading', { name: 'Check your answers' })).toBeInTheDocument();
    expect(screen.getByText(/the expert said: For about eight years/)).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit summary' })[0]!);
    const field = screen.getByLabelText('Summary of background');
    await userEvent.clear(field);
    await userEvent.type(field, 'Eight years running coffee sourcing for a 60-store chain.');
    await userEvent.click(screen.getByRole('button', { name: 'Save summary' }));
    expect(await screen.findByText('Edited by you')).toBeInTheDocument();
    await waitFor(() => expect(db.get().interviews[id]?.summaries[0]?.isEdited).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: 'Submit interview' }));
    expect(
      await screen.findByRole('heading', { name: 'Under review, usually within 48 hours' }),
    ).toBeInTheDocument();
  });
});
