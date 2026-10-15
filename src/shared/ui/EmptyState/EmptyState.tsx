import type { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

export type EmptyStateProps = {
  /** A Carbon pictogram, e.g. `<Search aria-hidden />` from @carbon/pictograms-react. */
  pictogram?: ReactNode;
  title: string;
  /** One line: what this area is and why it is empty. */
  description: ReactNode;
  /** The single primary action that gets the user started. */
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
};

/** Pictogram + title + one line of help + one primary action (UX_PRINCIPLES §10). */
export function EmptyState({
  pictogram,
  title,
  description,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles.root}>
      {pictogram ? <div className={styles.pictogram}>{pictogram}</div> : null}
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
