'use client';

import { CodeSnippet, Modal } from '@carbon/react';
import { exportOverrides, type TokenOverrides } from '../../model/overrides';
import styles from './DesignSystemView.module.scss';

type ExportModalProps = {
  open: boolean;
  overrides: TokenOverrides;
  onClose: () => void;
};

export function ExportModal({ open, overrides, onClose }: ExportModalProps) {
  return (
    <Modal
      open={open}
      passiveModal
      size="md"
      modalHeading="Export token changes"
      onRequestClose={onClose}
    >
      <p className={styles.modalText}>
        Edits live in this browser only. Copy them into <code>src/styles/_themes.scss</code> so
        everyone gets them, then reset here.
      </p>
      <CodeSnippet type="multi" feedback="Copied" wrapText>
        {exportOverrides(overrides)}
      </CodeSnippet>
    </Modal>
  );
}
