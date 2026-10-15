import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { AskReportPanel } from './AskReportPanel';

const STARTERS = [
  'Summarise the key findings',
  'What does it say about lead times for equipment and fit-out?',
];

function renderPanel(onCite = vi.fn()) {
  return {
    onCite,
    ...renderWithProviders(
      <AskReportPanel itemId="lib_dubai_rents" sections={[]} starters={STARTERS} onCite={onCite} />,
      { persona: 'bilal' },
    ),
  };
}

describe('AskReportPanel (F3)', () => {
  it('answers with citations that jump to the section', async () => {
    const { onCite, container } = renderPanel();
    await expectNoAxeViolations(container);

    await userEvent.type(screen.getByLabelText('Your question'), 'What are rents in prime malls?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    const source = await screen.findByRole('button', { name: /^Source 1: Rent ranges/ });
    await userEvent.click(source);
    expect(onCite).toHaveBeenCalledWith('s1');
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Rate this response' })).toBeInTheDocument();
  });

  it('says when the report doesn’t cover a question and offers custom research', async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText('Your question'), 'What is the weather in Abha?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText(/I couldn’t find this in this report/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request research on this' })).toHaveAttribute(
      'href',
      '/ask',
    );
  });

  it('keeps the question when the answer is cut off, and retries it', async () => {
    setControls({ apiError: true });
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Summarise the key findings' }));
    expect(await screen.findByText('Answer interrupted')).toBeInTheDocument();

    setControls({ apiError: false });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const answers = await screen.findByRole('list', { name: 'Questions and answers' });
    await waitFor(() =>
      expect(within(answers).getByText(/Here are the main findings/)).toBeInTheDocument(),
    );
  });
});
