import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/test/mockBackend';
import { expectNoAxeViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { SignUpForm } from './SignUpForm';

import { mockRouter } from '@/test/navigation';

const { push } = mockRouter;

async function fillForm(email: string) {
  await userEvent.type(screen.getByLabelText('Full name'), 'Layla Nasser');
  await userEvent.type(screen.getByLabelText('Work email'), email);
  await userEvent.type(screen.getByLabelText('Password'), 'harbour2026');
  await userEvent.click(screen.getByText('I agree to the terms of use and privacy notice'));
}

describe('SignUpForm (F0)', () => {
  it('shows field errors and the password checklist before submitting', async () => {
    const { container } = renderWithProviders(<SignUpForm role="client" />);
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Accept the terms to create your account.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Password'), 'abc1');
    const rules = screen.getByRole('list', { name: 'Password must contain' });
    expect(within(rules).getByText(/A number/)).toHaveTextContent('(done)');
    expect(within(rules).getByText(/At least 10 characters/)).toHaveTextContent('(not yet)');
  });

  it('creates an unverified account and goes to the verify-email notice', async () => {
    renderWithProviders(<SignUpForm role="client" />);
    await fillForm('layla@nasser.example');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verify-email'));
    const user = Object.values(db.get().users).find((u) => u.email === 'layla@nasser.example');
    expect(user).toMatchObject({ role: 'client', emailVerified: false, provider: 'email' });
  });

  it('explains what to do when the email already has an account', async () => {
    renderWithProviders(<SignUpForm role="expert" />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Sara Al-Mansouri');
    await userEvent.type(screen.getByLabelText('Email'), 'sara.almansouri@mail.example');
    await userEvent.type(screen.getByLabelText('Password'), 'harbour2026');
    await userEvent.click(screen.getByText('I agree to the terms of use and privacy notice'));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/An account already uses this email/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('signs up with a new Apple identity and goes straight to onboarding', async () => {
    renderWithProviders(<SignUpForm role="expert" />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Apple' }));
    await userEvent.click(await screen.findByRole('button', { name: /Karim Aziz/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/expert/onboarding'));
  });
});
