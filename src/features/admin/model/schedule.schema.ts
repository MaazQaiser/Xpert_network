import { z } from 'zod';

/** The calendar colours a project can take: Carbon's tag palette, so they hold in both themes. */
export const scheduleColourSchema = z.enum(['blue', 'teal', 'purple', 'magenta', 'cyan', 'green']);
export type ScheduleColour = z.infer<typeof scheduleColourSchema>;

const personSchema = z.object({
  name: z.string(),
  /** The client's company, or the expert's role. */
  detail: z.string(),
  email: z.string().nullable(),
  photoUrl: z.string().nullable(),
});
export type SchedulePerson = z.infer<typeof personSchema>;

/**
 * One meeting on the PM's calendar. A booked call has a Google Meet link; a held slot is a time
 * offered to the client and kept free with the expert until the client picks.
 */
export const meetingSchema = z.object({
  id: z.string(),
  kind: z.enum(['booked', 'held']),
  projectId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  client: personSchema,
  expert: personSchema,
  meetUrl: z.string().url().nullable(),
});
export type Meeting = z.infer<typeof meetingSchema>;

export const scheduleProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  colour: scheduleColourSchema,
});
export type ScheduleProject = z.infer<typeof scheduleProjectSchema>;

export const scheduleSchema = z.object({
  /** Times are shown in this zone. */
  timeZone: z.string(),
  projects: z.array(scheduleProjectSchema),
  meetings: z.array(meetingSchema),
});
export type Schedule = z.infer<typeof scheduleSchema>;
