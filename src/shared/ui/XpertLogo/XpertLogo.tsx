import styles from './XpertLogo.module.scss';

export type XpertLogoProps = {
  /** Height of the mark in px; the wordmark scales with the type set, not with this. */
  size?: number;
  /** Show "Xpert Network" next to the mark. */
  wordmark?: boolean;
  /** A muted label after the wordmark, e.g. "Admin". */
  suffix?: string;
  /** Draw the mark in on first paint (lines trace, nodes pop). Off for reduced motion. */
  animated?: boolean;
  className?: string;
};

/**
 * The Xpert Network mark: four nodes joined so the lines read as an X and an N at once (the
 * shared diagonal), with a centre node where they cross. Experts and clients, connected.
 */
export function XpertLogo({
  size = 32,
  wordmark = false,
  suffix,
  animated = false,
  className,
}: XpertLogoProps) {
  const mark = (
    <svg
      className={styles.mark}
      data-animated={animated || undefined}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      {...(wordmark
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': 'Xpert Network' })}
    >
      <rect className={styles.tile} width="32" height="32" />
      <g className={styles.lines}>
        <path d="M9 9 V23" pathLength={1} />
        <path d="M9 9 L23 23" pathLength={1} />
        <path d="M23 23 V9" pathLength={1} />
        <path d="M23 9 L9 23" pathLength={1} />
      </g>
      <g className={styles.nodes}>
        <circle cx="9" cy="9" r="2.6" />
        <circle cx="23" cy="9" r="2.6" />
        <circle cx="9" cy="23" r="2.6" />
        <circle cx="23" cy="23" r="2.6" />
        <circle cx="16" cy="16" r="2" />
      </g>
    </svg>
  );

  if (!wordmark) return <span className={className}>{mark}</span>;
  return (
    <span className={[styles.lockup, className].filter(Boolean).join(' ')}>
      {mark}
      <span className={styles.wordmark}>
        Xpert Network
        {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      </span>
    </span>
  );
}
