import { describe, expect, it } from 'vitest';
import { isFocusedPage, onboardingRedirect } from './gate';

describe('onboardingRedirect', () => {
  it('sends a brand-new client to onboarding once', () => {
    expect(onboardingRedirect({ role: 'client', status: 'not_started' }, '/home')).toBe(
      '/onboarding',
    );
    expect(onboardingRedirect({ role: 'client', status: 'not_started' }, '/onboarding')).toBeNull();
    expect(onboardingRedirect({ role: 'client', status: 'skipped' }, '/home')).toBeNull();
    expect(onboardingRedirect({ role: 'client', status: 'in_progress' }, '/home')).toBeNull();
  });

  it('keeps unapproved experts on onboarding or the pending page', () => {
    expect(onboardingRedirect({ role: 'expert', status: 'in_progress' }, '/expert/calls')).toBe(
      '/expert/onboarding',
    );
    expect(onboardingRedirect({ role: 'expert', status: 'pending' }, '/expert/home')).toBe(
      '/expert/pending',
    );
    expect(
      onboardingRedirect({ role: 'expert', status: 'rejected' }, '/expert/pending'),
    ).toBeNull();
    expect(onboardingRedirect({ role: 'expert', status: 'approved' }, '/expert/calls')).toBeNull();
  });
});

describe('isFocusedPage', () => {
  it('hides navigation during onboarding and until an expert is approved', () => {
    expect(isFocusedPage({ role: 'client', status: 'in_progress' }, '/onboarding')).toBe(true);
    expect(isFocusedPage({ role: 'client', status: 'complete' }, '/home')).toBe(false);
    expect(isFocusedPage({ role: 'expert', status: 'pending' }, '/expert/pending')).toBe(true);
    expect(isFocusedPage({ role: 'expert', status: 'approved' }, '/expert/pending')).toBe(false);
  });
});
