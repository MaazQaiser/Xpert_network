'use client';

import { useEffect } from 'react';
import { IconButton, Layer } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import type { ExtendResearch } from '../../model/expertSearch.schema';
import type { Project } from '../../model/project.schema';
import { ExtendResearchForm } from './ExtendResearchForm';
import styles from './ExpertsTab.module.scss';

type ExtendResearchSheetProps = {
  project: Project;
  onClose: () => void;
  onSubmit: (criteria: ExtendResearch) => void;
};

/** A bottom sheet over the Experts tab with the Extend research form. Escape or Cancel closes it. */
export function ExtendResearchSheet({ project, onClose, onSubmit }: ExtendResearchSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.sheet} role="dialog" aria-modal="false" aria-labelledby="extend-title">
      <Layer>
        <ExtendResearchForm
          project={project}
          idPrefix="extend"
          className={styles.sheetForm}
          onCancel={onClose}
          onSubmit={onSubmit}
          header={
            <div className={styles.sheetHeader}>
              <div>
                <h3 id="extend-title" className={styles.sheetTitle}>
                  Extend research
                </h3>
                <p className={styles.sheetText}>
                  Tell the AI who else to look for. It adds the new experts to the table.
                </p>
              </div>
              <IconButton kind="ghost" size="md" label="Close" align="left" onClick={onClose}>
                <Close />
              </IconButton>
            </div>
          }
        />
      </Layer>
    </div>
  );
}
