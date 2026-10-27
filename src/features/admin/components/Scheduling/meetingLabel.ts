import type { Meeting } from '../../model/schedule.schema';
import { formatLongDate, formatTime } from './dates';

/** What a screen reader hears for a meeting, e.g. "Booked call: Kevin Walsh with Halden Group…". */
export function meetingLabel(meeting: Meeting): string {
  const start = new Date(meeting.startsAt);
  const end = new Date(meeting.endsAt);
  const kind = meeting.kind === 'booked' ? 'Booked call' : 'Held slot';
  return `${kind}: ${meeting.expert.name} with ${meeting.client.detail}, ${formatLongDate(start)}, ${formatTime(start)} to ${formatTime(end)}`;
}
