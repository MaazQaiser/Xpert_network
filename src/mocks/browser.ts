import { setupWorker, type SetupWorker } from 'msw/browser';
import { handlers } from './handlers';

// One worker per page. When hot reload re-runs this module after a handler change, the running
// worker swaps in the new handlers, so an open tab never keeps calling endpoints that changed.
const scope = globalThis as typeof globalThis & { __xnMockWorker?: SetupWorker };
if (scope.__xnMockWorker) scope.__xnMockWorker.resetHandlers(...handlers);
scope.__xnMockWorker ??= setupWorker(...handlers);

export const worker = scope.__xnMockWorker;
