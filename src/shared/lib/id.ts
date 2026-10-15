/** Short, readable ids for prototype data, e.g. "brf_k3x9q2". */
export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
