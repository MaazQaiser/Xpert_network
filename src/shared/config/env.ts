import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_PROTOTYPE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_MOCK_LATENCY_MS: z.coerce.number().int().min(0).default(400),
});

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them.
const parsed = envSchema.parse({
  NEXT_PUBLIC_PROTOTYPE: process.env.NEXT_PUBLIC_PROTOTYPE,
  NEXT_PUBLIC_MOCK_LATENCY_MS: process.env.NEXT_PUBLIC_MOCK_LATENCY_MS,
});

export const env = {
  isPrototype: parsed.NEXT_PUBLIC_PROTOTYPE,
  mockLatencyMs: parsed.NEXT_PUBLIC_MOCK_LATENCY_MS,
} as const;
