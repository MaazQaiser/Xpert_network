'use client';

import { useId, useState } from 'react';
import { Button, IconButton, NumberInput, Select, SelectItem, TextInput } from '@carbon/react';
import { Reset } from '@carbon/icons-react';
import { useThemePreference } from '@/providers/ThemeProvider';
import { StatusTag } from '@/shared/ui';
import { useTokenOverrides, useTokenValue } from '../../hooks/useTokenOverrides';
import { contrastRatio, isCssColor, keepAlpha, toHex } from '../../model/color';
import {
  scopeFor,
  type ChoiceToken,
  type LengthToken,
  type TokenControl,
} from '../../model/controls';
import { isSafeTokenValue, setTokenOverride } from '../../model/overrides';
import type { ColorToken } from '../../model/tokens';
import styles from './DesignSystemView.module.scss';

type ThemeScope = 'light' | 'dark';

export function TokenControlsPanel({
  controls,
  theme,
  title = 'Tokens',
  compact = false,
}: {
  controls: TokenControl[];
  theme: ThemeScope;
  title?: string;
  compact?: boolean;
}) {
  const overrides = useTokenOverrides();
  if (controls.length === 0) return null;

  return (
    <div className={compact ? styles.controlPanelCompact : styles.controlPanel}>
      <h3 className={styles.controlPanelTitle}>{title}</h3>
      <ul className={styles.tokenList}>
        {controls.map((control) => (
          <TokenControlRow
            key={controlKey(control)}
            control={control}
            theme={theme}
            isEdited={isControlEdited(control, theme, overrides)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Resolves light/dark from the app theme for panels that sit outside DesignSystemView. */
export function useDesignSystemTheme(): ThemeScope {
  const { theme } = useThemePreference();
  return theme === 'g100' ? 'dark' : 'light';
}

function controlKey(control: TokenControl) {
  if (control.kind === 'color') return control.token.name;
  if (control.kind === 'length') return control.token.name;
  return control.token.name;
}

function isControlEdited(
  control: TokenControl,
  theme: ThemeScope,
  overrides: ReturnType<typeof useTokenOverrides>,
) {
  const scope = scopeFor(control, theme);
  const name =
    control.kind === 'color'
      ? control.token.name
      : control.kind === 'length'
        ? control.token.name
        : control.token.name;
  return name in overrides[scope];
}

function TokenControlRow({
  control,
  theme,
  isEdited,
}: {
  control: TokenControl;
  theme: ThemeScope;
  isEdited: boolean;
}) {
  if (control.kind === 'color') {
    return <ColorControlRow token={control.token} theme={theme} isEdited={isEdited} />;
  }
  if (control.kind === 'length') {
    return (
      <LengthControlRow token={control.token} isEdited={isEdited} preview={control.token.preview} />
    );
  }
  return <ChoiceControlRow token={control.token} isEdited={isEdited} />;
}

function ColorControlRow({
  token,
  theme,
  isEdited,
}: {
  token: ColorToken;
  theme: ThemeScope;
  isEdited: boolean;
}) {
  const id = useId();
  const scope = scopeFor({ kind: 'color', token }, theme);
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

function LengthControlRow({
  token,
  isEdited,
  preview,
}: {
  token: LengthToken;
  isEdited: boolean;
  preview: LengthToken['preview'];
}) {
  const id = useId();
  const { shared } = useTokenOverrides();
  const raw = shared[token.name] ?? '';
  const px = lengthToPx(token, raw);

  const commit = (nextPx: number) => {
    if (nextPx < token.min || nextPx > token.max) return;
    const value = token.unit === 'rem' ? `${nextPx / 16}rem` : `${nextPx}px`;
    setTokenOverride('shared', token.name, value);
  };

  return (
    <li className={styles.colorRow}>
      <LengthPreview token={token} preview={preview} />
      <div className={styles.tokenMeta}>
        <span className={styles.tokenLabel}>{token.label}</span>
        <code className={styles.tokenName}>{token.name}</code>
        <span className={styles.tokenUsage}>{token.usage}</span>
      </div>
      <div className={styles.typeControls}>
        <NumberInput
          id={`${id}-len`}
          size="sm"
          label={token.unit === 'rem' ? 'Radius (px)' : 'Width (px)'}
          min={token.min}
          max={token.max}
          step={1}
          value={px}
          onChange={(_, { value }) => {
            const next = Number(value);
            if (Number.isFinite(next)) commit(next);
          }}
        />
        {token.name === '--cds-button-radius' ? <Button size="sm">Preview</Button> : null}
        {token.name === '--pt-field-radius' || token.name === '--pt-field-border-width' ? (
          <TextInput
            id={`${id}-field`}
            size="sm"
            labelText="Preview field"
            hideLabel
            placeholder="Riyadh"
          />
        ) : null}
        {isEdited ? (
          <IconButton
            kind="ghost"
            size="sm"
            label={`Reset ${token.label}`}
            align="left"
            onClick={() => setTokenOverride('shared', token.name, null)}
          >
            <Reset />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}

function lengthToPx(token: LengthToken, override: string) {
  if (!override) return token.defaultPx;
  if (token.unit === 'px') {
    const n = parseFloat(override);
    return Number.isFinite(n) ? n : token.defaultPx;
  }
  const rem = parseFloat(override);
  return Number.isFinite(rem) ? Math.round(rem * 16) : token.defaultPx;
}

function LengthPreview({
  token,
  preview,
}: {
  token: LengthToken;
  preview: LengthToken['preview'];
}) {
  if (preview === 'border') {
    return (
      <span
        className={styles.borderPreview}
        style={{ borderWidth: `var(${token.name})` }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={styles.radiusPreview}
      style={{ borderRadius: `var(${token.name})` }}
      aria-hidden="true"
    />
  );
}

function ChoiceControlRow({ token, isEdited }: { token: ChoiceToken; isEdited: boolean }) {
  const id = useId();
  const { shared } = useTokenOverrides();
  const current = shared[token.name];
  const selected =
    token.options.find((option) => option.value === current)?.label ??
    token.options[0]?.label ??
    '';

  return (
    <li className={styles.colorRow}>
      <span className={styles.cardPreview} aria-hidden="true" />
      <div className={styles.tokenMeta}>
        <span className={styles.tokenLabel}>{token.label}</span>
        <code className={styles.tokenName}>{token.name}</code>
        <span className={styles.tokenUsage}>{token.usage}</span>
      </div>
      <div className={styles.typeControls}>
        <Select
          id={id}
          size="sm"
          labelText={token.label}
          value={selected}
          onChange={(event) => {
            const match = token.options.find((option) => option.label === event.target.value);
            if (!match) return;
            if (match.value === null) {
              setTokenOverride('shared', token.name, null);
            } else {
              setTokenOverride('shared', token.name, match.value);
            }
          }}
        >
          {token.options.map((option) => (
            <SelectItem key={option.label} value={option.label} text={option.label} />
          ))}
        </Select>
        {isEdited ? (
          <IconButton
            kind="ghost"
            size="sm"
            label={`Reset ${token.label}`}
            align="left"
            onClick={() => setTokenOverride('shared', token.name, null)}
          >
            <Reset />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}
