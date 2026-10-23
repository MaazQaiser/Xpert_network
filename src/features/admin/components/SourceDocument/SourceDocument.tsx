'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@carbon/react';
import type { SourcePage } from '../../model/project.schema';
import styles from './SourceDocument.module.scss';

type SourceDocumentProps = {
  title: string;
  fileName: string | null;
  pages: SourcePage[];
  pageCount: number;
  page: number;
  onPageChange: (page: number) => void;
  /** The brief item whose source passage should be highlighted. */
  highlightFor?: string | null;
  /** Human label for a highlighted passage, e.g. "Question 1". */
  labelFor?: (sourceFor: string) => string;
  hint?: string;
  /** Inside another surface (e.g. the inbox reading pane): no card of its own. */
  embedded?: boolean;
};

/** A mocked rendering of the client's document with AI source highlights (wireframe 03). */
export function SourceDocument({
  title,
  fileName,
  pages,
  pageCount,
  page,
  onPageChange,
  highlightFor = null,
  labelFor,
  hint,
  embedded = false,
}: SourceDocumentProps) {
  const current = pages.find((p) => p.page === page);
  const highlightRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightFor, page]);

  return (
    <section
      className={`${styles.root} ${embedded ? styles.embedded : ''}`}
      aria-labelledby="source-document-title"
    >
      <div className={styles.header}>
        <h2 id="source-document-title" className={styles.title}>
          {title}
        </h2>
        <span className={styles.meta} aria-live="polite">
          Page {page} of {pageCount}
        </span>
      </div>
      <div
        className={styles.sheet}
        aria-label={fileName ? `${fileName}, page ${page}` : `Page ${page}`}
      >
        {current && current.blocks.length > 0 ? (
          current.blocks.map((block) => {
            const isHighlighted = block.sourceFor !== null && block.sourceFor === highlightFor;
            const isSource = block.sourceFor !== null;
            if (block.kind === 'heading') {
              return (
                <p key={block.id} className={styles.heading}>
                  {block.text}
                </p>
              );
            }
            return (
              <p
                key={block.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={
                  isHighlighted ? styles.highlight : isSource ? styles.source : styles.text
                }
              >
                {isHighlighted && block.sourceFor && labelFor ? (
                  <span className={styles.highlightLabel}>
                    Source of {labelFor(block.sourceFor)}
                  </span>
                ) : null}
                {isHighlighted ? <mark>{block.text}</mark> : block.text}
              </p>
            );
          })
        ) : (
          <p className={styles.text}>The AI didn’t find text on this page.</p>
        )}
      </div>
      <div className={styles.footer}>
        <Button
          kind="tertiary"
          size="sm"
          className={styles.navButton}
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
        <Button
          kind="tertiary"
          size="sm"
          className={styles.navButton}
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
