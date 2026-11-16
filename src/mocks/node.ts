import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { getsalesHandlers } from './handlers/getsales.handlers';
import { requirementsHandlers } from './handlers/requirements.handlers';
import { scioHandlers } from './handlers/scio.handlers';
import { searchHandlers } from './handlers/search.handlers';

// GetSales, Scio, requirements and people searches are mocked for tests only; the browser worker
// lets them through to the real backend.
export const server = setupServer(
  ...handlers,
  ...getsalesHandlers,
  ...scioHandlers,
  ...requirementsHandlers,
  ...searchHandlers,
);
