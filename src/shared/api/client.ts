import type { z } from 'zod';
import { ApiError, apiErrorBodySchema, fallbackMessage } from './errors';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions<TSchema extends z.ZodType> = {
  schema: TSchema;
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
};

export const API_BASE = '/api';

async function toApiError(response: Response): Promise<ApiError> {
  const json: unknown = await response.json().catch(() => null);
  const parsed = apiErrorBodySchema.safeParse(json);
  if (parsed.success) return new ApiError(response.status, parsed.data.code, parsed.data.message);
  const code = response.status === 404 ? 'not_found' : 'server_error';
  return new ApiError(response.status, code, fallbackMessage(code));
}

export async function send(
  path: string,
  { method = 'GET', body, signal }: Omit<RequestOptions<z.ZodType>, 'schema'> = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
      signal: signal ?? null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network', fallbackMessage('network'));
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

/**
 * Typed request through the API seam. Every response is validated with Zod at the boundary
 * (CLAUDE.md non-negotiable 8), so mock fixtures can't drift from the types.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  { schema, ...options }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const response = await send(path, options);
  const json: unknown = response.status === 204 ? null : await response.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(response.status, 'invalid_response', fallbackMessage('invalid_response'));
  }
  return parsed.data;
}
