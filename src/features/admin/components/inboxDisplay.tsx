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

/** "09:42" today, "Yesterday", then "20 Oct" (wireframe 02). */
export function receivedLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (sameDay(date, now)) return time.format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  return day.format(date);
}
