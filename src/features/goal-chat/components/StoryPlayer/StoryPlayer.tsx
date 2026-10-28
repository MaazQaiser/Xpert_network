'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@carbon/react';
import { routes } from '@/shared/config/routes';
import type { StoryPlaybackStatus } from '../../hooks/useStoryPlayback';
import styles from './StoryPlayer.module.scss';

type StoryPlayerProps = {
  status: StoryPlaybackStatus;
  position: number;
  total: number;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  children: ReactNode;
};

/** Play, pause and replay for a seeded brief. The thread is the child once it starts. */
export function StoryPlayer({
  status,
  position,
  total,
  onPlay,
  onPause,
  onReplay,
  children,
}: StoryPlayerProps) {
  const progressLabel = { playing: 'Playing', paused: 'Paused', done: 'Played', ready: '' }[status];

  return (
    <>
      {status === 'ready' ? (
        <div className={styles.stage}>
          <h2 className={styles.stageTitle}>Play this conversation</h2>
          <p className={styles.stageBody}>
            Messages arrive one at a time, the way a live brief does. Pause, replay and reset are in
            prototype controls.
          </p>
          <Button size="lg" onClick={onPlay}>
            Play conversation
          </Button>
        </div>
      ) : (
        children
      )}
      {status === 'ready' ? null : (
        <div className={styles.dock}>
          {status === 'playing' ? (
            <Button kind="tertiary" size="sm" onClick={onPause}>
              Pause
            </Button>
          ) : null}
          {status === 'paused' ? (
            <Button size="sm" onClick={onPlay}>
              Resume
            </Button>
          ) : null}
          <Button kind="tertiary" size="sm" onClick={onReplay}>
            Replay
          </Button>
          <p className={styles.progress} aria-live="polite">
            {progressLabel} · {position} of {total}
          </p>
          <Button kind="ghost" size="sm" as={Link} href={routes.client.ask}>
            New brief
          </Button>
        </div>
      )}
    </>
  );
}
