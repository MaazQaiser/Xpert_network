'use client';

import { useId } from 'react';
import styles from './AdminLoginFrame.module.scss';

// The hub (Xpert Network) in the middle, experts around it. Portraits are the demo placeholders
// from public/images/avatars/expert-headshots; the art is decorative and hidden from assistive tech.
const HUB = { x: 240, y: 200 };
const EXPERTS = [
  { x: 96, y: 96, photo: 'jake-morrison' },
  { x: 256, y: 50, photo: 'ashley-turner' },
  { x: 404, y: 118, photo: 'marcus-hayes' },
  { x: 414, y: 290, photo: 'sophia-bell' },
  { x: 250, y: 352, photo: 'derek-hall' },
  { x: 82, y: 286, photo: 'emily-carter' },
] as const;
// Experts also know each other: a few links around the ring.
const RING = [
  [0, 1],
  [1, 2],
  [3, 4],
  [5, 0],
] as const;
const R = 22;

export function NetworkArt() {
  const uid = useId().replace(/:/g, '');
  return (
    <svg className={styles.art} viewBox="0 0 480 400" aria-hidden="true" focusable="false">
      <defs>
        {EXPERTS.map((e, i) => (
          <clipPath key={e.photo} id={`${uid}-clip-${i}`}>
            <circle cx={e.x} cy={e.y} r={R} />
          </clipPath>
        ))}
      </defs>

      {/* Back layer: links draw in, then dots flow from each expert to the hub. */}
      <g className={styles.linkLayer} data-layer="back">
        {RING.map(([a, b], i) => (
          <line
            key={`ring-${a}-${b}`}
            className={styles.ringLink}
            style={{ '--i': i + EXPERTS.length } as React.CSSProperties}
            x1={EXPERTS[a].x}
            y1={EXPERTS[a].y}
            x2={EXPERTS[b].x}
            y2={EXPERTS[b].y}
            pathLength={1}
          />
        ))}
        {EXPERTS.map((e, i) => (
          <line
            key={`link-${e.photo}`}
            className={styles.link}
            style={{ '--i': i } as React.CSSProperties}
            x1={e.x}
            y1={e.y}
            x2={HUB.x}
            y2={HUB.y}
            pathLength={1}
          />
        ))}
        {EXPERTS.map((e, i) => (
          <line
            key={`flow-${e.photo}`}
            className={styles.flow}
            style={{ '--i': i } as React.CSSProperties}
            x1={e.x}
            y1={e.y}
            x2={HUB.x}
            y2={HUB.y}
            pathLength={100}
          />
        ))}
      </g>

      {/* Front layer: experts, then the hub with its pulse. */}
      <g className={styles.nodeLayer} data-layer="front">
        {EXPERTS.map((e, i) => (
          <g key={e.photo} className={styles.expert} style={{ '--i': i } as React.CSSProperties}>
            <circle className={styles.expertRing} cx={e.x} cy={e.y} r={R + 3} />
            <image
              href={`/images/avatars/expert-headshots/${e.photo}.jpg`}
              x={e.x - R}
              y={e.y - R}
              width={R * 2}
              height={R * 2}
              clipPath={`url(#${uid}-clip-${i})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        ))}
        <g className={styles.hub}>
          <circle className={styles.hubPulse} cx={HUB.x} cy={HUB.y} r={34} />
          <rect className={styles.hubTile} x={HUB.x - 26} y={HUB.y - 26} width={52} height={52} />
          <g className={styles.hubMark} transform={`translate(${HUB.x - 16} ${HUB.y - 16})`}>
            <path d="M9 9 V23 M9 9 L23 23 M23 23 V9 M23 9 L9 23" />
            <circle cx="9" cy="9" r="2.6" />
            <circle cx="23" cy="9" r="2.6" />
            <circle cx="9" cy="23" r="2.6" />
            <circle cx="23" cy="23" r="2.6" />
            <circle cx="16" cy="16" r="2" />
          </g>
        </g>
      </g>
    </svg>
  );
}
