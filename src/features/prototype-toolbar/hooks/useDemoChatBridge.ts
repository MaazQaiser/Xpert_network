'use client';

import { useEffect, useRef } from 'react';
import {
  getDemoChat,
  setDemoChatStatus,
  subscribeDemoChat,
  type DemoChatAction,
  type DemoChatStatus,
} from '../model/demoChat';

type DemoChatHandlers = Record<DemoChatAction, () => void>;

type DemoChatBridgeOptions = DemoChatHandlers & {
  /** True while a seeded brief is on screen and can take play, pause, replay and reset. */
  active: boolean;
  status: DemoChatStatus;
};

/**
 * Publishes the open brief's playback to the prototype toolbar and runs the
 * buttons the presenter presses there.
 */
export function useDemoChatBridge({
  active,
  status,
  play,
  pause,
  replay,
  reset,
}: DemoChatBridgeOptions): void {
  const handlers = useRef<DemoChatHandlers>({ play, pause, replay, reset });

  useEffect(() => {
    handlers.current = { play, pause, replay, reset };
  }, [play, pause, replay, reset]);

  useEffect(() => {
    if (!active) {
      setDemoChatStatus('away');
      return;
    }
    setDemoChatStatus(status);
    return () => setDemoChatStatus('away');
  }, [active, status]);

  useEffect(() => {
    if (!active) return;
    let seen = getDemoChat().ticket;
    return subscribeDemoChat(() => {
      const next = getDemoChat();
      if (next.ticket === seen || !next.action) return;
      seen = next.ticket;
      handlers.current[next.action]();
    });
  }, [active]);
}
