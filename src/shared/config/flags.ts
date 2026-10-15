/** Feature flags. Every AI surface and voice mode is flagged (ARCHITECTURE.md §7). */
export const flags = {
  aiGoalChat: true,
  aiReportQa: true,
  aiQuoteDrafter: true,
  voiceInterview: true,
} as const;

export type FlagName = keyof typeof flags;

export function isEnabled(flag: FlagName): boolean {
  return flags[flag];
}
