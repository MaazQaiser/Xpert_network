import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestDemoChat, resetDemoChatBus } from '../model/demoChat';
import { useDemoChatBridge } from './useDemoChatBridge';

describe('useDemoChatBridge', () => {
  afterEach(() => {
    resetDemoChatBus();
  });

  it('runs a presenter action that arrives after the brief is open', () => {
    const replay = vi.fn();
    const pause = vi.fn();
    renderHook(() =>
      useDemoChatBridge({
        active: true,
        status: 'playing',
        play: vi.fn(),
        pause,
        replay,
        reset: vi.fn(),
      }),
    );

    act(() => requestDemoChat('pause'));
    act(() => requestDemoChat('replay'));

    expect(pause).toHaveBeenCalledOnce();
    expect(replay).toHaveBeenCalledOnce();
  });

  it('ignores actions pressed before a brief is open', () => {
    const play = vi.fn();
    act(() => requestDemoChat('play'));

    renderHook(() =>
      useDemoChatBridge({
        active: true,
        status: 'ready',
        play,
        pause: vi.fn(),
        replay: vi.fn(),
        reset: vi.fn(),
      }),
    );

    expect(play).not.toHaveBeenCalled();
  });
});
