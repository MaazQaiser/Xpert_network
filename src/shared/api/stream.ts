import type { z } from 'zod';
import { send } from './client';
import { ApiError, fallbackMessage } from './errors';

/**
 * POSTs to a streaming endpoint and yields newline-delimited JSON events, each validated
 * against `schema`. Used by AI surfaces (goal chat, report Q&A, interviewer).
 */
export async function* streamEvents<TSchema extends z.ZodType>(
  path: string,
  body: unknown,
  schema: TSchema,
  signal?: AbortSignal,
): AsyncGenerator<z.infer<TSchema>> {
  const response = await send(path, { method: 'POST', body, ...(signal ? { signal } : {}) });
  if (!response.body) throw new ApiError(500, 'invalid_response', fallbackMessage('invalid_response'));

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = schema.safeParse(JSON.parse(line));
        if (!parsed.success) {
          throw new ApiError(500, 'invalid_response', fallbackMessage('invalid_response'));
        }
        yield parsed.data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
