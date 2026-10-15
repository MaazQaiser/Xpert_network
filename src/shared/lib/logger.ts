type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test') return;
  console[level](`[proptyop] ${event}`, data ?? '');
}

/** Never log PII or research content (FRONTEND_STANDARDS §9) — ids and event names only. */
export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => log('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => log('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => log('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
};
