import { briefsHandlers, subjectsHandlers } from './briefs.handlers';
import { onboardingHandlers } from './onboarding.handlers';
import { authHandlers, sessionHandlers } from './session.handlers';
import { walletHandlers } from './wallet.handlers';

export const handlers = [
  ...sessionHandlers,
  ...authHandlers,
  ...onboardingHandlers,
  ...walletHandlers,
  ...briefsHandlers,
  ...subjectsHandlers,
];
