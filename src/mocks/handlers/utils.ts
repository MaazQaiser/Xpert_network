import { delay, HttpResponse } from 'msw';
import { getControls } from '../controls';
import { db } from '../store/db';
import { USERS } from '../fixtures/users';
import type { User } from '@/features/auth';

/** Base latency from env; "Slow network" multiplies it (PRODUCT_PLAN §8). */
export function latencyMs(): number {
  const base = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 400);
  const value = Number.isFinite(base) ? base : 400;
  return getControls().slowNetwork ? value * 6 + 1500 : value;
}

export async function simulateNetwork(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  await delay(latencyMs());
}

export function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status });
}

/** Returns a 500 when the toolbar's "API error" toggle is on. */
export function injectedError() {
  if (!getControls().apiError) return null;
  return errorResponse(
    500,
    'server_error',
    'We couldn’t complete that because of a problem on our side. Try again in a moment.',
  );
}

export function currentUser(): User | null {
  const id = db.get().sessionUserId;
  return Object.values(USERS).find((user) => user.id === id) ?? null;
}

export function unauthorized() {
  return errorResponse(401, 'unauthorized', 'Your session has ended. Log in again to continue.');
}

/** Writes newline-delimited JSON events with human-feeling pacing. */
export function ndjsonStream(
  produce: (send: (event: unknown) => void, pause: (ms: number) => Promise<void>) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const isTest = process.env.NODE_ENV === 'test';
  const slow = getControls().slowNetwork ? 3 : 1;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const pause = (ms: number) => (isTest ? Promise.resolve() : delay(ms * slow));
      try {
        await produce(send, pause);
      } finally {
        controller.close();
      }
    },
  });
  return new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
}

/** Splits text into word-sized tokens for streaming. */
export function tokenise(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}
