import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { expectNoAxeViolations } from '@/test/axe';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { renderWithProviders } from '@/test/render';
import { AdminLoginFrame } from './AdminLoginFrame';

describe('AdminLoginFrame', () => {
  it('shows the brand panel beside the form', async () => {
    const { container } = renderWithProviders(
      <ThemeProvider>
        <AdminLoginFrame title="Admin console" description="For Xpert Network staff only.">
          <form aria-label="Log in" />
        </AdminLoginFrame>
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Admin console' })).toBeInTheDocument();
    expect(screen.getByText('Xpert Network')).toBeInTheDocument();
    expect(screen.getByText('Every project, from brief to booked call.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'What the console covers' }).children).toHaveLength(5);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('form', { name: 'Log in' }));
    await expectNoAxeViolations(container);
  });
});
