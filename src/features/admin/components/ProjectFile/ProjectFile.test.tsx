import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { ProjectFile } from './ProjectFile';

const project = () => db.get().adminProjects['PRJ-1042']!;

describe('ProjectFile (F12, screen 03)', () => {
  it('shows the brief under the title and the sections in tabs', async () => {
    const { container } = renderWithProviders(<ProjectFile projectId="PRJ-1042" />, {
      persona: 'ops',
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Sports headphones, North America outdoor research',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ridgeline is researching sports headphones/)).toBeInTheDocument();
    // The sections live in tabs, each with its count.
    expect(screen.getByRole('tab', { name: /Expert profile needed\s*6/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[tabs.length - 1]).toHaveAccessibleName(/^Experts\s*0/);
    await userEvent.click(screen.getByRole('tab', { name: /Screening questions\s*8/ }));
    expect(
      screen.getByRole('heading', { name: 'Screening questions · 8 found' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Needs confirming\s*2/ }));
    expect(screen.getByRole('heading', { name: 'Needs confirming (2)' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows four section tabs and the screening questions without page numbers', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    expect(await screen.findAllByRole('tab')).toHaveLength(4);
    expect(screen.queryByRole('tab', { name: /Source document/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Activity/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Screening questions/ }));
    expect(screen.queryByText('p.4')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Edit question/ })).toHaveLength(8);
    expect(screen.getAllByRole('button', { name: /^Delete question/ })).toHaveLength(8);
  });

  it('finds experts on request, then sends one the screening questions', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /^Experts/ }));
    expect(screen.getByText('No experts yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start finding experts' }));
    expect(await screen.findByText(/8 experts found/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Experts\s*8/ })).toBeInTheDocument();
    // One send button per row; the first row is Expert #4821.
    await userEvent.click(screen.getAllByRole('button', { name: 'Send screening questions' })[0]!);
    expect(await screen.findByText(/Screening questions sent to Expert #4821/)).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(db.get().adminScreening['PRJ-1042']).toEqual(['exp_4821']);
  }, 15_000);

  it('shows flags and match bars, and refresh turns Sent into the reply status', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /^Experts/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start finding experts' }));
    expect(await screen.findByText(/8 experts found/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole('button', { name: 'Send screening questions' })[0]!);
    expect(await screen.findByText('Sent')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh screening status' }));
    expect(await screen.findByText(/Screening status updated/)).toBeInTheDocument();
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('extends the research from the bottom sheet and adds more experts', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /^Experts/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start finding experts' }));
    await screen.findByText(/8 experts found/, {}, { timeout: 5000 });
    await userEvent.click(screen.getByRole('button', { name: 'Extend research with AI' }));
    const sheet = screen.getByRole('dialog', { name: 'Extend research' });
    expect(within(sheet).getByRole('checkbox', { name: 'LinkedIn' })).toBeChecked();
    expect(within(sheet).getByRole('checkbox', { name: 'Expert network API' })).toBeChecked();
    // At least one source is required.
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'LinkedIn' }));
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Expert network API' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Find more experts' }));
    expect(await within(sheet).findByText('Choose at least one source.')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'LinkedIn' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Find more experts' }));
    expect(await screen.findByText(/18 experts found/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Extend research' })).not.toBeInTheDocument();
  }, 15_000);

  it('removes a question with undo', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /Screening questions/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete question 8' }));
    expect(
      await screen.findByRole('heading', { name: 'Screening questions · 7 found' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(project().questions).toHaveLength(8));
  });

  it('confirms the deadline the AI proposed', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /Needs confirming/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm 13 Nov' }));
    expect(await screen.findByText('Confirmed: 13 Nov.')).toBeInTheDocument();
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
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send to Jenna' }));
    expect(await screen.findByText(/Email sent to Jenna Cho/)).toBeInTheDocument();
    expect(db.get().adminMail).toHaveLength(1);
  });

  it('shows View screening answers in the header only once questions are sent', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-1042" />, { persona: 'ops' });
    await userEvent.click(await screen.findByRole('tab', { name: /^Experts/ }));
    expect(
      screen.queryByRole('button', { name: 'Approve & find experts' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View screening answers/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start finding experts' }));
    await screen.findByText(/8 experts found/, {}, { timeout: 5000 });
    await userEvent.click(screen.getAllByRole('button', { name: 'Send screening questions' })[0]!);
    expect(await screen.findByRole('link', { name: 'View screening answers (1)' })).toHaveAttribute(
      'href',
      '/admin/projects/PRJ-1042/responses',
    );
  }, 15_000);

  it('shows not found for an unknown project', async () => {
    renderWithProviders(<ProjectFile projectId="PRJ-0000" />, { persona: 'ops' });
    expect(await screen.findByText('We couldn’t find that project')).toBeInTheDocument();
  });
});
