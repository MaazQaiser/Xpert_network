'use client';

import { CheckmarkFilled, CircleDash } from '@carbon/icons-react';
import { PASSWORD_RULES } from '../../model/credentials';
import styles from './PasswordRules.module.scss';

/** Live checklist under a new-password field, so rules are visible before submitting. */
export function PasswordRules({ value, id }: { value: string; id: string }) {
  return (
    <ul id={id} className={styles.root} aria-label="Password must contain">
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.test(value);
        return (
          <li key={rule.id} className={isMet ? styles.met : styles.rule}>
            {isMet ? (
              <CheckmarkFilled size={16} aria-hidden="true" className={styles.iconMet} />
            ) : (
              <CircleDash size={16} aria-hidden="true" />
            )}
            <span>
              {rule.label}
              <span className={styles.visuallyHidden}>{isMet ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
