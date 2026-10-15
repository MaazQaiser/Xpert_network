import type { StatusTone } from '@/shared/ui';
import type { RequestStatus } from '../model/request.schema';

export const STATUS_TONE: Record<RequestStatus, StatusTone> = {
  quote_requested: 'neutral',
  quote_ready: 'info',
  accepted: 'progress',
  recruiting: 'progress',
  interviews: 'progress',
  analysis: 'progress',
  delivered: 'success',
  declined: 'neutral',
  expired: 'warning',
  cancelled: 'neutral',
};
