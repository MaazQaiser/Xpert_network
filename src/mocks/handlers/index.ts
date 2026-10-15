import { briefsHandlers, subjectsHandlers } from './briefs.handlers';
import { authHandlers, sessionHandlers } from './session.handlers';
import { walletHandlers } from './wallet.handlers';

export const handlers = [
  ...sessionHandlers,
  ...authHandlers,
  ...walletHandlers,
  ...briefsHandlers,
  ...subjectsHandlers,
];
