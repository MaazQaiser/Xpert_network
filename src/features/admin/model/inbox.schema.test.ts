import { describe, expect, it } from 'vitest';
import {
  allDayEveryDayForm,
  formToSchedule,
  isQueuedMessage,
  scheduleSummary,
  scheduleToForm,
  senderHealth,
  senderScheduleFormSchema,
  type LinkedinMessage,
  type SenderProfile,
  type SenderSchedule,
} from './inbox.schema';

const weekdays: SenderSchedule = {
  timezone: 'Asia/Karachi',
  timeblocks: [1, 2, 3, 4, 5].map((dow) => ({ dow, min: 540, max: 1080 })),
};

describe('sender schedules', () => {
  it('sums up the hours in a few words', () => {
    expect(scheduleSummary(weekdays)).toBe('Mon–Fri, 09:00–18:00');
    expect(scheduleSummary(formToSchedule(allDayEveryDayForm('UTC')))).toBe('24 hours, every day');
    expect(
      scheduleSummary({
        timezone: 'UTC',
        timeblocks: [
          { dow: 1, min: 540, max: 1080 },
          { dow: 3, min: 540, max: 1080 },
          { dow: 0, min: 540, max: 1080 },
        ],
      }),
    ).toBe('Mon, Wed, Sun, 09:00–18:00');
    expect(
      scheduleSummary({
        timezone: 'UTC',
        timeblocks: [
          { dow: 1, min: 540, max: 1080 },
          { dow: 4, min: 540, max: 720 },
        ],
      }),
    ).toBe('2 days a week, custom hours');
    expect(scheduleSummary(null)).toBe('no hours set');
  });

  it('turns a schedule into the dialog and back, Monday first', () => {
    const form = scheduleToForm(weekdays);
    expect(form.days.map((d) => d.dow)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(form.days[0]).toEqual({ dow: 1, enabled: true, start: '09:00', end: '18:00' });
    expect(form.days[5]?.enabled).toBe(false);
    expect(formToSchedule(form)).toEqual(weekdays);
    // GetSales' app has no 24:00, so the day ends at 23:59.
    expect(allDayEveryDayForm('UTC').days[0]).toMatchObject({ start: '00:00', end: '23:59' });
    expect(formToSchedule(allDayEveryDayForm('UTC')).timeblocks[0]).toEqual({
      dow: 1,
      min: 0,
      max: 1439,
    });
    // A day saved elsewhere as ending at 24:00 still reads as all day.
    const legacy = { timezone: 'UTC', timeblocks: [{ dow: 1, min: 0, max: 1440 }] };
    expect(scheduleToForm(legacy).days[0]?.end).toBe('23:59');
    expect(scheduleSummary(legacy)).toBe('Mon, 24 hours');
  });

  it('refuses hours that cannot work', () => {
    const form = scheduleToForm(weekdays);
    const messages = (f: typeof form) =>
      senderScheduleFormSchema.safeParse(f).error?.issues.map((i) => i.message) ?? [];

    expect(messages(form)).toEqual([]);
    expect(messages({ ...form, days: form.days.map((d) => ({ ...d, enabled: false })) })).toContain(
      'Turn on at least one day.',
    );
    expect(
      messages({ ...form, days: form.days.map((d, i) => (i ? d : { ...d, end: '08:00' })) }),
    ).toEqual(['End after the start.']);
    expect(
      messages({ ...form, days: form.days.map((d, i) => (i ? d : { ...d, start: '9am' })) }),
    ).toEqual(['Use HH:MM, e.g. 09:00.']);
    expect(
      messages({ ...form, days: form.days.map((d, i) => (i ? d : { ...d, end: '24:00' })) }),
    ).toEqual(['Use HH:MM, e.g. 09:00.']);
    // A day that's off isn't checked.
    expect(
      messages({ ...form, days: form.days.map((d) => (d.enabled ? d : { ...d, start: 'x' })) }),
    ).toEqual([]);
  });
});

describe('isQueuedMessage', () => {
  const message = (patch: Partial<LinkedinMessage>): LinkedinMessage => ({
    uuid: 'm',
    direction: 'sent',
    text: 'Hi',
    subject: null,
    sentAt: null,
    status: 'done',
    linkedinType: 'message',
    failReason: null,
    read: true,
    ...patch,
  });

  it('counts a sent message waiting for its window as still going out', () => {
    expect(isQueuedMessage(message({ status: 'new' }))).toBe(true);
    expect(isQueuedMessage(message({ status: 'in_progress' }))).toBe(true);
    expect(isQueuedMessage(message({ status: 'done' }))).toBe(false);
    expect(isQueuedMessage(message({ status: 'failed' }))).toBe(false);
    expect(isQueuedMessage(message({ direction: 'received', status: 'new' }))).toBe(false);
  });
});

describe('senderHealth', () => {
  const sender = (patch: Partial<SenderProfile>): SenderProfile => ({
    uuid: 'sp-1',
    firstName: 'Ateeb',
    lastName: 'Ahmad',
    label: null,
    status: 'enabled',
    linkedinConnected: true,
    avatarUrl: null,
    createdAt: null,
    linkedinState: 'ok',
    linkedinIssue: null,
    outsideHoursUntil: null,
    ...patch,
  });

  it('says Connected only when the sender can actually send', () => {
    expect(senderHealth(sender({}))).toEqual({ tone: 'ok', text: 'Connected', detail: null });
    // Older data without a state falls back to whether LinkedIn is linked.
    expect(senderHealth(sender({ linkedinState: undefined })).text).toBe('Connected');
    expect(senderHealth(sender({ linkedinState: undefined, linkedinConnected: false })).text).toBe(
      'Not connected',
    );
  });

  it('names the first thing that stops the sender', () => {
    expect(senderHealth(sender({ linkedinState: 'not_connected' }))).toMatchObject({
      tone: 'off',
      text: 'Not connected',
    });
    expect(senderHealth(sender({ status: 'disabled' }))).toMatchObject({
      tone: 'warning',
      text: 'Paused',
    });
    expect(
      senderHealth(
        sender({ linkedinState: 'login_issue', linkedinIssue: 'Verification code needed' }),
      ),
    ).toEqual({ tone: 'error', text: 'Needs sign-in', detail: 'Verification code needed' });
    expect(senderHealth(sender({ linkedinState: 'issue' }))).toMatchObject({
      tone: 'error',
      text: 'Not working',
    });
    expect(senderHealth(sender({ linkedinState: 'stopped' }))).toMatchObject({
      tone: 'warning',
      text: 'Stopped',
    });
    expect(senderHealth(sender({ linkedinState: 'starting' })).text).toBe('Starting…');
    expect(senderHealth(sender({ linkedinState: 'unknown' }))).toMatchObject({
      tone: 'off',
      text: 'Status unknown',
    });
    // A sign-in problem matters more than a pause.
    expect(
      senderHealth(
        sender({ linkedinState: 'login_issue', outsideHoursUntil: '2026-11-13T09:00:00+05:00' }),
      ).text,
    ).toBe('Needs sign-in');
  });

  it('says when sending resumes, in the schedule’s time zone', () => {
    const health = senderHealth(
      sender({
        outsideHoursUntil: '2026-11-13T09:00:00+05:00',
        linkedinSchedule: { timezone: 'Asia/Karachi', timeblocks: [] },
      }),
    );
    expect(health).toEqual({
      tone: 'warning',
      text: 'Sending paused until Fri 09:00',
      detail: null,
      note: 'Outside this sender’s hours',
    });
    // Same moment, a schedule set in London hours.
    expect(
      senderHealth(
        sender({
          outsideHoursUntil: '2026-11-13T09:00:00+05:00',
          linkedinSchedule: { timezone: 'Europe/London', timeblocks: [] },
        }),
      ).text,
    ).toBe('Sending paused until Fri 04:00');
  });
});
