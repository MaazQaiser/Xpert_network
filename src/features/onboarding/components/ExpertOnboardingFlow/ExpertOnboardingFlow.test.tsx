import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { mockRouter } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { ExpertPending } from '../ExpertPending/ExpertPending';
import { ExpertOnboardingFlow } from './ExpertOnboardingFlow';

async function signUpExpert(): Promise<string> {
  const response = await fetch('/api/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'expert',
      name: 'Karim Aziz',
      email: 'karim@aziz.example',
      password: 'harbour2026',
    }),
  });
  const { user } = (await response.json()) as { user: { id: string } };
  return user.id;
}

/** Copies Sara's complete profile onto the new expert, at the given status/step. */
function completeProfile(userId: string, patch: Record<string, unknown>) {
  db.update((draft) => {
    const sara = draft.expertOnboarding.usr_sara!;
    draft.expertOnboarding[userId] = { ...sara, decidedAt: null, submittedAt: null, ...patch };
  });
}

describe('ExpertOnboardingFlow (F7)', () => {
  it('validates Basics, saves it and moves to Work history', async () => {
    const userId = await signUpExpert();
    const { container } = renderWithProviders(<ExpertOnboardingFlow />);

    expect(await screen.findByRole('heading', { name: 'Basics' })).toBeInTheDocument();
    await screen.findByLabelText('Country you’re based in');
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText(/Describe your expertise in a short line/)).toBeInTheDocument();
    expect(screen.getByText('Enter your years of experience.')).toBeInTheDocument();

    await userEvent.type(
      screen.getByLabelText('Headline'),
      'Former regional operations director, QSR',
    );
    await userEvent.type(screen.getByLabelText('Years of relevant experience'), '18');
    await userEvent.selectOptions(screen.getByLabelText('Country you’re based in'), 'ct_sa');
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(await screen.findByRole('heading', { name: 'Work history' })).toBeInTheDocument();
    expect(db.get().expertOnboarding[userId]).toMatchObject({
      status: 'in_progress',
      currentStep: 'work',
      basics: { yearsExperience: 18, countryId: 'ct_sa' },
    });
    expect(db.get().users[userId]?.title).toBe('Former regional operations director, QSR');
  });

  it('submits a complete profile for review', async () => {
    const userId = await signUpExpert();
    completeProfile(userId, { status: 'in_progress', currentStep: 'submit' });
    renderWithProviders(<ExpertOnboardingFlow />);

    expect(await screen.findByRole('heading', { name: 'Check and submit' })).toBeInTheDocument();
    await screen.findByText('Procurement & sourcing');
    await userEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/expert/pending'));
    expect(db.get().expertOnboarding[userId]?.status).toBe('pending');
  });
});

describe('ExpertPending (F7)', () => {
  it('shows the decision note when changes are needed and reopens the profile', async () => {
    const userId = await signUpExpert();
    completeProfile(userId, {
      status: 'rejected',
      decisionNote: 'Add your last two roles with dates, then resubmit.',
      decidedAt: '2026-10-14T10:00:00.000Z',
    });
    const { container } = renderWithProviders(<ExpertPending />);

    expect(
      await screen.findByRole('heading', { name: 'We couldn’t approve your profile yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add your last two roles/)).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Update and resubmit' }));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/expert/onboarding'));
    expect(db.get().expertOnboarding[userId]?.status).toBe('in_progress');
  });
});
