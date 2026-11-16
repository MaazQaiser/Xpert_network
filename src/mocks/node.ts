import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { getsalesHandlers } from './handlers/getsales.handlers';
import { requirementsHandlers } from './handlers/requirements.handlers';
import { scioHandlers } from './handlers/scio.handlers';

// GetSales and Scio are mocked for tests only; the browser worker lets them through to the real
// backend.
export const server = setupServer(
  ...handlers,
  ...getsalesHandlers,
  ...scioHandlers,
  ...requirementsHandlers,
);
