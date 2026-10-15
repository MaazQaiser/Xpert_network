import { briefsHandlers, subjectsHandlers } from './briefs.handlers';
import { libraryHandlers } from './library.handlers';
import { notificationsHandlers } from './notifications.handlers';
import { onboardingHandlers } from './onboarding.handlers';
import { profileHandlers } from './profile.handlers';
import { authHandlers, sessionHandlers } from './session.handlers';
import { walletHandlers } from './wallet.handlers';

export const handlers = [
  ...sessionHandlers,
  ...authHandlers,
  ...onboardingHandlers,
  ...profileHandlers,
  ...notificationsHandlers,
  ...libraryHandlers,
  ...walletHandlers,
  ...briefsHandlers,
  ...subjectsHandlers,
];
