import type { StatusTone } from '@/shared/ui';
import type { ApplicationStatus, MatchLevel } from '../model/call.schema';

export const MATCH_TAG: Record<MatchLevel, 'green' | 'blue' | 'gray'> = {
  strong: 'green',
  good: 'blue',
  partial: 'gray',
};

export const APPLICATION_STATUS: Record<ApplicationStatus, { tone: StatusTone; label: string }> = {
  applied: { tone: 'progress', label: 'Applied · under review' },
  approved: { tone: 'success', label: 'Approved · interview ready' },
  not_eligible: { tone: 'neutral', label: 'Not eligible' },
};
