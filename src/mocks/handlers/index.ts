import { briefsHandlers } from './briefs.handlers';
import { sessionHandlers } from './session.handlers';
import { walletHandlers } from './wallet.handlers';

export const handlers = [...sessionHandlers, ...walletHandlers, ...briefsHandlers];
