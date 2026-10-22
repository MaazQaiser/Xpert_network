'use client';

import { TokenControlsPanel, useDesignSystemTheme } from './TokenControls';
import { SHAPE_CONTROLS } from '../../model/controls';
import { SPACING_SCALE } from '../../model/tokens';
import styles from './DesignSystemView.module.scss';

export function ShapeTokens() {
  const theme = useDesignSystemTheme();

  return (
    <div className={styles.sections}>
      <section className={styles.section} aria-labelledby="shape-tokens">
        <h2 id="shape-tokens" className={styles.sectionTitle}>
          Corners, borders and shadows
        </h2>
        <p className={styles.sectionText}>
          Button and field corners (ADR 0010), card radius, field outline width, card elevation and
          the shadow colour used on menus and dropdowns. Changes apply to both themes and update the
          live previews on the Components tab.
        </p>
        <TokenControlsPanel controls={SHAPE_CONTROLS} theme={theme} title="Shape tokens" />
      </section>

      <section className={styles.section} aria-labelledby="shape-spacing">
        <h2 id="shape-spacing" className={styles.sectionTitle}>
          Spacing scale
        </h2>
        <p className={styles.sectionText}>
          Carbon&rsquo;s fixed scale, compiled into every component. Inside components use 03–05,
          between groups 06–07, between page sections 09 and up.
        </p>
        <ul className={styles.spacingList}>
          {SPACING_SCALE.map((px, index) => {
            const step = String(index + 1).padStart(2, '0');
            return (
              <li key={step} className={styles.spacingRow}>
                <code className={styles.tokenName}>$spacing-{step}</code>
                <span className={styles.tokenUsage}>{px}px</span>
                <span className={`${styles.spacingBar} ${styles[`space${step}`] ?? ''}`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
