export type DemoChatStatus = 'away' | 'ready' | 'playing' | 'paused' | 'done';

export type DemoChatAction = 'play' | 'pause' | 'replay' | 'reset';

export type DemoChatSnapshot = {
  status: DemoChatStatus;
  /** Increments on every presenter action so a repeat of the same action still runs. */
  ticket: number;
  action: DemoChatAction | null;
};

const SERVER_SNAPSHOT: DemoChatSnapshot = { status: 'away', ticket: 0, action: null };

let snapshot: DemoChatSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(next: DemoChatSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getDemoChat(): DemoChatSnapshot {
  return snapshot;
}

export function getDemoChatServerSnapshot(): DemoChatSnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeDemoChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDemoChatStatus(status: DemoChatStatus): void {
  if (snapshot.status === status) return;
  emit({ ...snapshot, status });
}

export function requestDemoChat(action: DemoChatAction): void {
  emit({ ...snapshot, ticket: snapshot.ticket + 1, action });
}

/** Test isolation. The bus is a module singleton shared with the toolbar. */
export function resetDemoChatBus(): void {
  emit(SERVER_SNAPSHOT);
}
