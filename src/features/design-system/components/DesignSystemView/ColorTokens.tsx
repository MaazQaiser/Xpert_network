'use client';

import { useId, useState } from 'react';
import { IconButton, TextInput } from '@carbon/react';
import { Reset } from '@carbon/icons-react';
import { StatusTag } from '@/shared/ui';
import { useTokenOverrides, useTokenValue } from '../../hooks/useTokenOverrides';
import { contrastRatio, isCssColor, keepAlpha, toHex } from '../../model/color';
import { isSafeTokenValue, setTokenOverride } from '../../model/overrides';
import { COLOR_GROUPS, type ColorToken } from '../../model/tokens';
import styles from './DesignSystemView.module.scss';

type Scope = 'light' | 'dark';

export function ColorTokens({ scope }: { scope: Scope }) {
  const overrides = useTokenOverrides();

  return (
    <div className={styles.sections}>
      {COLOR_GROUPS.map((group) => (
        <section key={group.id} className={styles.section} aria-labelledby={`colors-${group.id}`}>
          <h2 id={`colors-${group.id}`} className={styles.sectionTitle}>
            {group.title}
          </h2>
          <p className={styles.sectionText}>{group.description}</p>
          <ul className={styles.tokenList}>
            {group.tokens.map((token) => (
              <ColorTokenRow
                key={token.name}
                token={token}
                scope={scope}
                isEdited={token.name in overrides[scope]}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ColorTokenRow({
  token,
  scope,
  isEdited,
}: {
  token: ColorToken;
  scope: Scope;
  isEdited: boolean;
}) {
  const id = useId();
  const value = useTokenValue(token.name);
  const against = useTokenValue(token.contrast?.against ?? token.name);
  const ratio = token.contrast ? contrastRatio(value, against) : null;
  const passes = ratio !== null && token.contrast ? ratio >= token.contrast.min : false;
  const set = (next: string | null) => setTokenOverride(scope, token.name, next);

  return (
    <li className={styles.colorRow}>
      <span
        className={styles.swatch}
        style={{ backgroundColor: `var(${token.name})` }}
        aria-hidden="true"
      />
      <div className={styles.tokenMeta}>
        <span className={styles.tokenLabel}>{token.label}</span>
        <code className={styles.tokenName}>{token.name}</code>
        <span className={styles.tokenUsage}>{token.usage}</span>
      </div>
      <div className={styles.tokenControls}>
        <input
          type="color"
          className={styles.colorPicker}
          aria-label={`Pick ${token.label}`}
          value={toHex(value) ?? '#000000'}
          onChange={(event) => set(keepAlpha(event.target.value, value))}
        />
        <ColorValueField
          key={`${scope}:${value}`}
          id={`${id}-value`}
          label={`${token.label} value`}
          initial={value}
          onCommit={set}
        />
        {ratio !== null && token.contrast ? (
          <StatusTag
            size="sm"
            tone={passes ? 'success' : 'error'}
            label={`${ratio.toFixed(1)}:1 ${passes ? 'passes' : 'fails'} ${token.contrast.min}:1`}
          />
        ) : null}
        {isEdited ? (
          <IconButton
            kind="ghost"
            size="sm"
            label={`Reset ${token.label}`}
            align="left"
            onClick={() => set(null)}
          >
            <Reset />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}

function ColorValueField({
  id,
  label,
  initial,
  onCommit,
}: {
  id: string;
  label: string;
  initial: string;
  onCommit: (value: string) => void;
}) {
  const [isInvalid, setIsInvalid] = useState(false);

  const commit = (raw: string) => {
    const next = raw.trim();
    if (next === initial) return;
    if (!isCssColor(next) || !isSafeTokenValue(next)) {
      setIsInvalid(true);
      return;
    }
    setIsInvalid(false);
    onCommit(next);
  };

  return (
    <div className={styles.colorValue}>
      <TextInput
        id={id}
        size="sm"
        labelText={label}
        hideLabel
        defaultValue={initial}
        invalid={isInvalid}
        invalidText="Use a colour like #1f1e1b or rgba(0, 0, 0, 0.5)."
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value);
        }}
      />
    </div>
  );
}
