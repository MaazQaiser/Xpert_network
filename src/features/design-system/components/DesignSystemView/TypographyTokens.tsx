'use client';

import { useId } from 'react';
import { IconButton, NumberInput, Select, SelectItem } from '@carbon/react';
import { Reset } from '@carbon/icons-react';
import { useTokenOverrides } from '../../hooks/useTokenOverrides';
import { setTokenOverride } from '../../model/overrides';
import { FONT_WEIGHTS, TYPE_TOKENS, typeVar, type TypeToken } from '../../model/tokens';
import styles from './DesignSystemView.module.scss';

/** `heading-07` → `typeHeading07`, the specimen class in DesignSystemView.module.scss. */
const specimenClass = (id: string) =>
  'type' + id.replace(/(^|-)(\w)/g, (_, __, letter: string) => letter.toUpperCase());

export function TypographyTokens() {
  const { shared } = useTokenOverrides();

  return (
    <div className={styles.sections}>
      <section className={styles.section} aria-labelledby="type-families">
        <h2 id="type-families" className={styles.sectionTitle}>
          Typefaces
        </h2>
        <p className={styles.sectionText}>
          Inter for every word of UI and reading text; IBM Plex Mono for code, IDs and citations. No
          serif.
        </p>
        <div className={styles.families}>
          <div className={styles.family}>
            <span className={styles.familySample}>Aa</span>
            <span className={styles.tokenLabel}>Inter Variable</span>
            <code className={styles.tokenName}>sans · 300–700</code>
          </div>
          <div className={styles.family}>
            <span className={`${styles.familySample} ${styles.familyMono}`}>Aa</span>
            <span className={styles.tokenLabel}>IBM Plex Mono</span>
            <code className={styles.tokenName}>mono · 400</code>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="type-scale">
        <h2 id="type-scale" className={styles.sectionTitle}>
          Type scale
        </h2>
        <p className={styles.sectionText}>
          Carbon&rsquo;s productive type tokens. Changes apply to both themes and to every component
          that uses the token.
        </p>
        <ul className={styles.tokenList}>
          {TYPE_TOKENS.map((token) => (
            <TypeTokenRow key={token.id} token={token} shared={shared} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function TypeTokenRow({ token, shared }: { token: TypeToken; shared: Record<string, string> }) {
  const id = useId();
  const sizeVar = typeVar(token.id, 'font-size');
  const lineVar = typeVar(token.id, 'line-height');
  const weightVar = typeVar(token.id, 'font-weight');
  const fontSize = parseFloat(shared[sizeVar] ?? '') || token.defaults.fontSize;
  const lineHeight = Number(shared[lineVar] ?? token.defaults.lineHeight);
  const fontWeight = Number(shared[weightVar] ?? token.defaults.fontWeight);
  const isEdited = [sizeVar, lineVar, weightVar].some((name) => name in shared);
  const sizePx = Math.round(fontSize * 16);

  return (
    <li className={styles.typeRow}>
      <p className={`${styles.typeSpecimen} ${styles[specimenClass(token.id)] ?? ''}`}>
        {token.sample}
      </p>
      <div className={styles.tokenMeta}>
        <code className={styles.tokenLabel}>{token.id}</code>
        <span className={styles.tokenUsage}>{token.usage}</span>
        <span className={styles.tokenUsage}>
          {sizePx}px / {lineHeight.toFixed(2)} · {fontWeight}
        </span>
      </div>
      <div className={styles.typeControls}>
        <NumberInput
          id={`${id}-size`}
          size="sm"
          label="Size (px)"
          min={10}
          max={96}
          step={1}
          value={sizePx}
          onChange={(_, { value }) => {
            const px = Number(value);
            if (Number.isFinite(px) && px >= 10 && px <= 96) {
              setTokenOverride('shared', sizeVar, `${px / 16}rem`);
            }
          }}
        />
        <NumberInput
          id={`${id}-line`}
          size="sm"
          label="Line height"
          min={1}
          max={2}
          step={0.05}
          value={Number(lineHeight.toFixed(2))}
          onChange={(_, { value }) => {
            const next = Number(value);
            if (Number.isFinite(next) && next >= 1 && next <= 2) {
              setTokenOverride('shared', lineVar, next.toFixed(2));
            }
          }}
        />
        <Select
          id={`${id}-weight`}
          size="sm"
          labelText="Weight"
          value={String(fontWeight)}
          onChange={(event) => setTokenOverride('shared', weightVar, event.target.value)}
        >
          {FONT_WEIGHTS.map((weight) => (
            <SelectItem key={weight.value} value={String(weight.value)} text={weight.label} />
          ))}
        </Select>
        {isEdited ? (
          <IconButton
            kind="ghost"
            size="sm"
            label={`Reset ${token.id}`}
            align="left"
            onClick={() =>
              [sizeVar, lineVar, weightVar].forEach((name) =>
                setTokenOverride('shared', name, null),
              )
            }
          >
            <Reset />
          </IconButton>
        ) : null}
      </div>
    </li>
  );
}
