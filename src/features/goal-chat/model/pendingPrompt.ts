/**
 * The first message typed on Home, handed to the new brief's chat in memory.
 * Kept out of the URL so research goals don't land in history or logs.
 */
const pending = new Map<string, string>();

export function setPendingPrompt(briefId: string, text: string): void {
  pending.set(briefId, text);
}

/** Returns the prompt once, then forgets it. */
export function takePendingPrompt(briefId: string): string | null {
  const text = pending.get(briefId) ?? null;
  pending.delete(briefId);
  return text;
}
