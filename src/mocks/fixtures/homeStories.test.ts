import { describe, expect, it } from 'vitest';
import { HOME_STORIES, seedHomeStories } from '@/features/goal-chat';
import { LIBRARY_ITEMS } from './library';
import { seedRequests } from './requests';

describe('home stories', () => {
  const now = new Date('2026-10-16T12:00:00.000Z');
  const { briefs, messages } = seedHomeStories(now);
  const requests = seedRequests(now);

  it.each(Object.values(HOME_STORIES))(
    '$personaId points at a real library item, brief, and request',
    (story) => {
      expect(LIBRARY_ITEMS.some((item) => item.id === story.libraryId)).toBe(true);
      expect(briefs[story.briefId]?.ownerId).toBe(story.ownerId);
      expect(requests[story.requestId]?.ownerId).toBe(story.ownerId);

      const thread = messages[story.briefId] ?? [];
      expect(thread.length).toBeGreaterThanOrEqual(10);
      expect(thread.length).toBeLessThanOrEqual(16);
      const widgets = thread.flatMap((message) => (message.widget ? [message.widget] : []));
      expect(widgets.some((widget) => widget.kind === 'library-search')).toBe(true);
      const report = widgets.find((widget) => widget.kind === 'report-artifact');
      expect(report?.kind).toBe('report-artifact');
      if (report?.kind === 'report-artifact') {
        expect(report.reportId).toBe(story.libraryId);
        expect(report.sources.map((source) => source.percent)).toEqual([44, 12, 32, 12]);
      }
      expect(widgets.at(-1)?.kind).toBe('custom-request');
      const request = widgets.find((widget) => widget.kind === 'custom-request');
      expect(request?.kind === 'custom-request' ? request.requestId : null).toBe(story.requestId);
    },
  );
});
