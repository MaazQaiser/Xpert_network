'use client';

import { ChevronRight } from '@carbon/icons-react';
import styles from './AccountList.module.scss';

export type AccountListItem = { id: string; name: string; detail: string };

type AccountListProps = {
  items: AccountListItem[];
  /** Accessible name of the list. */
  label: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** A pick-one list of people: avatar, name, one line of detail, chevron at the row's edge. */
export function AccountList({ items, label, onSelect, disabled = false }: AccountListProps) {
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={styles.row}
            disabled={disabled}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials(item.name)}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.detail}>{item.detail}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className={styles.chevron} />
          </button>
        </li>
      ))}
    </ul>
  );
}
