import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ProjectFile } from './ProjectFile';

const project = () => db.get().adminProjects['PRJ-1042']!;

describe('ProjectFile (F12, screen 03)', () => {
  it('shows the AI brief, facts, profile and questions', async () => {
    const { container } = renderWithProviders(<ProjectFile projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', {
        name: 'EV battery recycling — Europe market diligence',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Client questions · 8 found' })).toBeInTheDocument();
    expect(screen.getByText('Not in doc')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs confirming (2)' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('jumps to the source of a question and highlights it', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Show the source of question 3, page 5' }),
    );
    expect(screen.getByText('Page 5 of 14')).toBeInTheDocument();
    expect(screen.getByText('Source of question 3')).toBeInTheDocument();
  });

  it('removes a question with undo', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Remove question 8' }));
    expect(
      await screen.findByRole('heading', { name: 'Client questions · 7 found' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(project().questions).toHaveLength(8));
  });

  it('confirms the deadline the AI proposed', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm 2 Nov' }));
    expect(await screen.findByText('Confirmed: 2 Nov.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs confirming (1)' })).toBeInTheDocument();
  });

  it('drafts the clarification email and sends it only when the PM presses send', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Draft clarification email' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect((within(dialog).getByLabelText('Message') as HTMLTextAreaElement).value).toContain(
        'Budget',
      ),
    );
    expect(db.get().adminMail).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send to Sarah' }));
    expect(await screen.findByText(/Email sent to Sarah Lin/)).toBeInTheDocument();
    expect(db.get().adminMail).toHaveLength(1);
  });

  it('warns about open items before approving, then goes to matching', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('button', { name: 'Approve & find experts' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('2 things still need confirming')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve anyway' }));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/projects/PRJ-1042/match'),
    );
    expect(project().status).toBe('matching');
  });

  it('shows not found for an unknown project', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-0000" />, { persona: 'ops' });
    expect(await screen.findByText('We couldn’t find that project')).toBeInTheDocument();
  });
});
