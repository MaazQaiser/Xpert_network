import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../model/message.schema';
import { useStoryPlayback } from './useStoryPlayback';

const script: ChatMessage[] = [
  {
    id: 'm1',
    role: 'user',
    text: 'Should we join the round?',
    step: 'goal',
    widget: null,
    createdAt: '2026-10-16T10:00:00.000Z',
  },
  {
    id: 'm2',
    role: 'assistant',
    text: 'The library has it.',
    step: 'options',
    widget: { kind: 'library-report', reportId: 'lib_gcc_coffee_2026' },
    createdAt: '2026-10-16T10:01:00.000Z',
  },
];

describe('useStoryPlayback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on a play step, then reveals the user line before the assistant', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryPlayback(script));

    expect(result.current.status).toBe('ready');
    expect(result.current.visible).toHaveLength(0);

    act(() => result.current.play());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).toBe('playing');
    expect(result.current.visible.map((message) => message.text)).toEqual([
      'Should we join the round?',
    ]);

    act(() => result.current.pause());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(result.current.status).toBe('paused');
    expect(result.current.visible.some((message) => message.role === 'assistant')).toBe(false);
  });

  it('streams the assistant line and leaves the report card in the thread', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryPlayback(script));

    act(() => result.current.play());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(result.current.status).toBe('done');
    expect(result.current.visible).toHaveLength(2);
    expect(result.current.visible[1]?.widget).toEqual({
      kind: 'library-report',
      reportId: 'lib_gcc_coffee_2026',
    });
    expect(result.current.position).toBe(2);
  });

  it('resets to an empty thread and replay starts again from the first line', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStoryPlayback(script));

    act(() => result.current.play());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(result.current.status).toBe('done');

    act(() => result.current.reset());
    expect(result.current.status).toBe('ready');
    expect(result.current.visible).toHaveLength(0);

    act(() => result.current.replay());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('playing');
    expect(result.current.visible.map((message) => message.text)).toEqual([
      'Should we join the round?',
    ]);
  });
});
