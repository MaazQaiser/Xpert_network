'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';
import { Theme } from '@carbon/react';
import { ThemeToggle } from '@/providers/ThemeToggle';
import { XpertLogo } from '@/shared/ui';
import { NetworkArt } from './NetworkArt';
import styles from './AdminLoginFrame.module.scss';

const STEPS = ['Brief', 'Match', 'Screen', 'Book', 'Call'] as const;
// How far each layer of the network moves with the pointer, in px.
const PARALLAX = { back: 4, front: 12 } as const;

type AdminLoginFrameProps = { title: string; description?: string; children: ReactNode };

/**
 * Admin login: a navy brand panel (logo, the expert network drawing itself, the console's
 * steps) beside the form. The network follows the pointer a little and reacts to the form:
 * it brightens while a field has focus, pulses while logging in and shakes on an error.
 */
export function AdminLoginFrame({ title, description, children }: AdminLoginFrameProps) {
  const panel = useRef<HTMLDivElement>(null);

  // Parallax: the pointer's offset from the panel's centre (-1…1) moves the links a little and
  // the people a little more, set straight on the layers so nothing re-renders.
  const setOffset = (x: number, y: number) => {
    const el = panel.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.querySelectorAll<SVGGElement>('[data-layer]').forEach((layer) => {
      const reach = PARALLAX[layer.dataset.layer as keyof typeof PARALLAX] ?? 0;
      layer.style.transform = `translate(${(x * reach).toFixed(1)}px, ${(y * reach).toFixed(1)}px)`;
    });
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = panel.current;
    if (!el || event.pointerType !== 'mouse') return;
    const box = el.getBoundingClientRect();
    setOffset(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      ((event.clientY - box.top) / box.height) * 2 - 1,
    );
  };
  const onPointerLeave = () => setOffset(0, 0);

  return (
    <div className={styles.root}>
      <Theme
        theme="g100"
        ref={panel}
        className={styles.brand}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <XpertLogo wordmark suffix="Admin" animated size={32} />
        <div className={styles.artWrap}>
          <NetworkArt />
        </div>
        <div className={styles.pitch}>
          <p className={styles.headline}>Every project, from brief to booked call.</p>
          <ol className={styles.steps} aria-label="What the console covers">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </Theme>

      <div className={styles.formSide}>
        <div className={styles.topBar}>
          <ThemeToggle />
        </div>
        <main id="main-content" className={styles.formMain}>
          <div className={styles.column}>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
            <div className={styles.body}>{children}</div>
          </div>
        </main>
        <footer className={styles.footer}>
          © {new Date().getFullYear()} Xpert Solutions. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
