'use client';

import { StatusTag, type StatusTone } from '@/shared/ui';
import type { InboxRequest } from '../model/inbox.schema';

const STATUS: Record<InboxRequest['status'], { tone: StatusTone; label: string }> = {
  brief_ready: { tone: 'info', label: 'Brief ready' },
  reading: { tone: 'progress', label: 'Reading doc' },
  extracting: { tone: 'progress', label: 'Extracting text' },
  needs_client_info: { tone: 'warning', label: 'Needs client info' },
  cant_open: { tone: 'error', label: 'Can’t open file' },
  converted: { tone: 'success', label: 'Converted' },
  client_reply: { tone: 'info', label: 'Client picked' },
};

export function InboxStatusTag({
  request,
  size = 'sm',
}: {
  request: InboxRequest;
  size?: 'sm' | 'md';
}) {
  const { tone, label } = STATUS[request.status];
  const progress = request.attachment?.progress;
  const text =
    request.status === 'converted' && request.projectId
      ? request.projectId
      : request.status === 'reading' && progress != null
        ? `${label} · ${progress}%`
        : label;
  return <StatusTag tone={tone} label={text} size={size} />;
}

// Placeholder portraits for the demo senders (randomuser.me, saved in /public/images/avatars).
// They are stand-ins, not the real people; anyone else gets their initials.
const SENDER_PHOTOS: Record<string, string> = {
  'jenna.cho@ridgelineinsights.example': '/images/avatars/jenna-cho.jpg',
  'omar.siddiqui@northgate.example': '/images/avatars/omar-siddiqui.jpg',
  'priya.raman@lakeview.example': '/images/avatars/priya-raman.jpg',
  'j.okafor@brightlinepe.example': '/images/avatars/james-okafor.jpg',
  'elena@corvidpartners.example': '/images/avatars/elena-duarte.jpg',
  'tom.becker@halden.example': '/images/avatars/tom-becker.jpg',
};

/** The sender's photo if we have one, else null (callers show initials). */
export function senderPhoto(email: string): string | null {
  return SENDER_PHOTOS[email] ?? null;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function attachmentLine(request: InboxRequest): string {
  const file = request.attachment;
  if (!file) return 'No attachment';
  return [file.name, file.pages ? `${file.pages} pages` : null, file.note]
    .filter(Boolean)
    .join(' · ');
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' });
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const full = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' });

const longDay = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** The open email's date, as in Apple Mail: "22 October 2026 at 14:12". */
export function longDateLabel(iso: string): string {
  const date = new Date(iso);
  return `${longDay.format(date)} at ${time.format(date)}`;
}

/** "Thursday 22 October 2026 at 14:12", for a hover title. */
export function fullDateLabel(iso: string): string {
  return full.format(new Date(iso));
}

/** "09:42" today, "Yesterday", then "20 Oct" (wireframe 02). */
export function receivedLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (sameDay(date, now)) return time.format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  return day.format(date);
}
