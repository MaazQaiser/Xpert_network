import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { getsalesHandlers } from './handlers/getsales.handlers';

// GetSales is mocked for tests only; the browser worker lets it through to the real backend.
export const server = setupServer(...handlers, ...getsalesHandlers);
