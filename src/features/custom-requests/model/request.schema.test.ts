import { describe, expect, it } from 'vitest';
import { isActive, trackerIndex } from './request.schema';

describe('request tracker', () => {
  it('places on-track statuses on their own step', () => {
    expect(trackerIndex({ status: 'interviews', timeline: [] })).toBe(4);
  });

  it('places a declined or expired request where it stopped', () => {
    expect(
      trackerIndex({
        status: 'declined',
        timeline: [
          { status: 'quote_requested', at: '2026-10-01', note: null },
          { status: 'quote_ready', at: '2026-10-02', note: null },
          { status: 'declined', at: '2026-10-03', note: null },
        ],
      }),
    ).toBe(1);
  });

  it('knows which requests are still open', () => {
    expect(isActive('analysis')).toBe(true);
    expect(isActive('cancelled')).toBe(false);
  });
});
