import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { LibraryReportWidget } from '../widgets/LibraryReportWidget';
import { ReportReview } from '../ReportReview/ReportReview';
import { ReportReviewProvider } from '../ReportReview/reportReviewContext';
import { ClientHome } from './ClientHome';

function ReportHarness() {
  const [reportId, setReportId] = useState<string | null>(null);
  return (
    <ReportReviewProvider onOpen={setReportId}>
      <LibraryReportWidget reportId="lib_gcc_coffee_2026" />
      {reportId ? <ReportReview reportId={reportId} onClose={() => setReportId(null)} /> : null}
    </ReportReviewProvider>
  );
}

describe('Home new brief', () => {
  it('replaces the greeting with the chat and a progress widget', async () => {
    renderWithProviders(<ClientHome />, { persona: 'ayesha' });

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Describe your research goal' }),
      'Should we join the Qahwa House round?',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('1 of 7')).toBeInTheDocument();
    expect(await screen.findByText(/Which of these is closest to your goal/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Brief progress' })).toBeInTheDocument();
  });

  it('opens a report review from the chat and closes it', async () => {
    renderWithProviders(<ReportHarness />, { persona: 'ayesha' });

    await userEvent.click(await screen.findByRole('button', { name: 'View report' }));
    expect(
      await screen.findByRole('heading', {
        name: 'GCC specialty coffee 2026: growth, pricing and competition',
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close report' }));
    expect(
      screen.queryByRole('heading', {
        name: 'GCC specialty coffee 2026: growth, pricing and competition',
      }),
    ).not.toBeInTheDocument();
  });
});
