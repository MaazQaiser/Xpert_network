import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ClientOnboardingFlow } from './ClientOnboardingFlow';

async function signUpClient(): Promise<string> {
  const response = await fetch('/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'client',
      name: 'Layla Nasser',
      email: 'layla@nasser.example',
      password: 'harbour2026',
    }),
  });
  const { user } = (await response.json()) as { user: { id: string } };
  return user.id;
}

describe('ClientOnboardingFlow (F1)', () => {
  it('validates step 1, saves it to the profile and moves to step 2', async () => {
    const userId = await signUpClient();
    const { container } = renderWithProviders(<ClientOnboardingFlow />);

    expect(await screen.findByRole('heading', { name: 'About you' })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Choose what best describes you.')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Investor or analyst/));
    await userEvent.type(screen.getByLabelText('Job title'), 'Associate');
    await userEvent.type(screen.getByLabelText('Organisation (optional)'), 'Dune Ventures');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'What you research' })).toBeInTheDocument();
    expect(db.get().users[userId]).toMatchObject({
      title: 'Associate',
      organisation: 'Dune Ventures',
    });
    expect(db.get().clientOnboarding[userId]?.status).toBe('in_progress');
  });

  it('can be skipped from any step', async () => {
    const userId = await signUpClient();
    renderWithProviders(<ClientOnboardingFlow />);

    await userEvent.click(await screen.findByRole('button', { name: 'Skip setup' }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/home'));
    expect(db.get().clientOnboarding[userId]?.status).toBe('skipped');
  });

  it('asks for a goal on the last step before starting a brief', async () => {
    const userId = await signUpClient();
    db.update((draft) => {
      const record = draft.clientOnboarding[userId];
      if (record) record.currentStep = 'goal';
    });
    renderWithProviders(<ClientOnboardingFlow />);

    await userEvent.click(await screen.findByRole('button', { name: 'Start my first brief' }));
    expect(await screen.findByText(/Choose a goal to start with/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Expand to a new region'));
    await userEvent.click(screen.getByRole('button', { name: 'Start my first brief' }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/ask?goal=expand'));
    expect(db.get().clientOnboarding[userId]).toMatchObject({
      status: 'complete',
      firstGoal: 'expand',
    });
  });
});
