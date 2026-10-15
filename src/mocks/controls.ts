/**
 * Prototype state toggles (PRODUCT_PLAN §8). Read by MSW handlers to inject latency, errors
 * and edge states; written by the prototype toolbar. Persisted per browser.
 */
export type CoverageScenario = 'auto' | 'all' | 'none';

export type PrototypeControls = {
  slowNetwork: boolean;
  apiError: boolean;
  emptyData: boolean;
  lowCredits: boolean;
  micDenied: boolean;
  coverage: CoverageScenario;
};

export const DEFAULT_CONTROLS: PrototypeControls = {
  slowNetwork: false,
  apiError: false,
  emptyData: false,
  lowCredits: false,
  micDenied: false,
  coverage: 'auto',
};

const STORAGE_KEY = 'proptyop.controls.v1';
const listeners = new Set<() => void>();

function load(): PrototypeControls {
  if (typeof window === 'undefined') return DEFAULT_CONTROLS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...DEFAULT_CONTROLS, ...(JSON.parse(raw) as Partial<PrototypeControls>) }
      : DEFAULT_CONTROLS;
  } catch {
    return DEFAULT_CONTROLS;
  }
}

let current: PrototypeControls = load();

export function getControls(): PrototypeControls {
  return current;
}

export function setControls(patch: Partial<PrototypeControls>): void {
  current = { ...current, ...patch };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
  listeners.forEach((listener) => listener());
}

export function resetControls(): void {
  setControls(DEFAULT_CONTROLS);
}

export function subscribeControls(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
