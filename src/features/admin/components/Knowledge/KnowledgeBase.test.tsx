import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setControls } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { KnowledgeBase } from './KnowledgeBase';
import { ReportReader } from './ReportReader';

describe('Knowledge base', () => {
  it('lists every call report and searches what the experts said', async () => {
    const { container } = renderWithProviders(<KnowledgeBase />, { persona: 'ops' });
    expect(await screen.findByText(/^\d+ research reports from expert calls$/)).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('link').length).toBeGreaterThan(1);
    await expectNoAxeViolations(container);

    // Search reaches into the answers and shows the sentence it found, marked.
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search reports' }),
      'works council',
    );
    expect(screen.getByText(/of \d+ reports match/)).toBeInTheDocument();
    expect(container.querySelector('mark')).toHaveTextContent(/works council/i);

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search reports' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search reports' }), 'zzzz');
    expect(screen.getByText(/No reports match/)).toBeInTheDocument();
  });

  it('opens a report to read', async () => {
    renderWithProviders(<KnowledgeBase />, { persona: 'ops' });
    const list = await screen.findByRole('list');
    const [first] = within(list).getAllByRole('link');
    const callId = first!.getAttribute('href')!.split('/').at(-1)!;
    renderWithProviders(<ReportReader callId={callId} />, { persona: 'ops' });
    expect(
      await screen.findByRole('heading', { name: 'What the client asked' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Knowledge base' })).toHaveAttribute(
      'href',
      '/admin/knowledge',
    );
  });

  it('shows an empty state with no reports, and an error with retry', async () => {
    setControls({ emptyData: true });
    const { unmount } = renderWithProviders(<KnowledgeBase />, { persona: 'ops' });
    expect(await screen.findByText('No reports yet')).toBeInTheDocument();
    unmount();
    setControls({ emptyData: false, apiError: true });
    renderWithProviders(<KnowledgeBase />, { persona: 'ops' });
    expect(await screen.findByText('The knowledge base didn’t load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });
});
