import { z } from 'zod';

export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

/** The single error type every API call throws (ARCHITECTURE.md §4). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Plain-language copy safe to show to the user: what happened + how to fix. */
  readonly userMessage: string;

  constructor(status: number, code: string, userMessage: string) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
  }
}

const FALLBACK_MESSAGES: Record<string, string> = {
  network: "We couldn't reach Xpert Network. Check your connection and try again.",
  invalid_response: 'We received something unexpected. Try again in a moment.',
  server_error: 'Something went wrong on our side. Try again in a moment.',
  not_found: "We couldn't find that. It may have been moved or deleted.",
  unauthorized: 'Your session has ended. Log in again to continue.',
};

export function fallbackMessage(code: string): string {
  return FALLBACK_MESSAGES[code] ?? FALLBACK_MESSAGES.server_error ?? 'Something went wrong.';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toUserMessage(error: unknown): string {
  return isApiError(error) ? error.userMessage : fallbackMessage('server_error');
}
