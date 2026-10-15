'use client';

import { useState } from 'react';
import { IconButton } from '@carbon/react';
import { ThumbsDown, ThumbsDownFilled, ThumbsUp, ThumbsUpFilled } from '@carbon/icons-react';
import { logger } from '../../lib/logger';
import styles from './AIFeedback.module.scss';

type Rating = 'up' | 'down' | null;

/** Thumbs up/down on an AI answer (AI_NATIVE §4.4). Logs ids only, never content. */
export function AIFeedback({ responseId }: { responseId: string }) {
  const [rating, setRating] = useState<Rating>(null);

  const rate = (next: Exclude<Rating, null>) => {
    const value = rating === next ? null : next;
    setRating(value);
    logger.info('ai_feedback', { responseId, rating: value });
  };

  return (
    <div className={styles.root} role="group" aria-label="Rate this response">
      <IconButton
        kind="ghost"
        size="sm"
        label="Helpful"
        aria-pressed={rating === 'up'}
        onClick={() => rate('up')}
      >
        {rating === 'up' ? <ThumbsUpFilled /> : <ThumbsUp />}
      </IconButton>
      <IconButton
        kind="ghost"
        size="sm"
        label="Not helpful"
        aria-pressed={rating === 'down'}
        onClick={() => rate('down')}
      >
        {rating === 'down' ? <ThumbsDownFilled /> : <ThumbsDown />}
      </IconButton>
      {rating ? (
        <span className={styles.thanks} role="status">
          Thanks for the feedback
        </span>
      ) : null}
    </div>
  );
}
