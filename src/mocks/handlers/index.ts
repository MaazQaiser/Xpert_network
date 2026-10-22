import { adminHandlers } from './admin.handlers';
import { briefsHandlers, subjectsHandlers } from './briefs.handlers';
import { callsHandlers } from './calls.handlers';
import { earningsHandlers } from './earnings.handlers';
import { interviewsHandlers } from './interviews.handlers';
import { libraryHandlers } from './library.handlers';
import { notificationsHandlers } from './notifications.handlers';
import { onboardingHandlers } from './onboarding.handlers';
import { profileHandlers } from './profile.handlers';
import { requestsHandlers } from './requests.handlers';
import { authHandlers, sessionHandlers } from './session.handlers';
import { walletHandlers } from './wallet.handlers';
import { workspaceHandlers } from './workspace.handlers';

export const handlers = [
  ...sessionHandlers,
  ...authHandlers,
  ...onboardingHandlers,
  ...profileHandlers,
  ...notificationsHandlers,
  ...libraryHandlers,
  ...requestsHandlers,
  ...walletHandlers,
  ...workspaceHandlers,
  ...callsHandlers,
  ...interviewsHandlers,
  ...earningsHandlers,
  ...briefsHandlers,
  ...subjectsHandlers,
  ...adminHandlers,
];
