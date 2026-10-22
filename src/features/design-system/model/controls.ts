import type { OverrideScope } from './overrides';
import { COLOR_GROUPS, type ColorToken } from './tokens';

export type LengthToken = {
  name: `--${string}`;
  label: string;
  usage: string;
  defaultPx: number;
  min: number;
  max: number;
  /** Radii are stored in rem so they scale with the user's font size; border widths in px. */
  unit: 'rem' | 'px';
  preview: 'radius' | 'border';
};

export type ChoiceToken = {
  name: `--${string}`;
  label: string;
  usage: string;
  /** `null` is the committed theme value (no override). */
  options: { label: string; value: string | null }[];
  preview: 'shadow';
};

export type TokenControl =
  | { kind: 'color'; token: ColorToken }
  | { kind: 'length'; token: LengthToken }
  | { kind: 'choice'; token: ChoiceToken };

/** Colours differ per theme; shape and elevation apply to both. */
export function scopeFor(control: TokenControl, theme: 'light' | 'dark'): OverrideScope {
  return control.kind === 'color' ? theme : 'shared';
}

const EXTRA_COLORS: ColorToken[] = [
  {
    name: '--cds-button-danger-primary',
    label: 'Button danger',
    usage: 'Delete and other destructive buttons',
    contrast: { against: '--cds-text-on-color', min: 4.5 },
  },
  {
    name: '--pt-control-edge',
    label: 'Control edge',
    usage: 'Checkbox and radio outline and checked fill',
    contrast: { against: '--cds-background', min: 3 },
  },
  {
    name: '--cds-support-success',
    label: 'Toggle on',
    usage: 'Toggle track when on, success icons',
    contrast: { against: '--cds-background', min: 3 },
  },
  {
    name: '--cds-layer-accent-01',
    label: 'Layer accent 01',
    usage: 'Table header row, contained tabs',
  },
  {
    name: '--cds-notification-background-info',
    label: 'Notification info background',
    usage: 'Low-contrast info notifications',
    contrast: { against: '--cds-text-primary', min: 4.5 },
  },
  {
    name: '--cds-notification-background-success',
    label: 'Notification success background',
    usage: 'Low-contrast success notifications',
    contrast: { against: '--cds-text-primary', min: 4.5 },
  },
  {
    name: '--cds-notification-background-warning',
    label: 'Notification warning background',
    usage: 'Low-contrast warning notifications',
    contrast: { against: '--cds-text-primary', min: 4.5 },
  },
  {
    name: '--cds-notification-background-error',
    label: 'Notification error background',
    usage: 'Low-contrast error notifications',
    contrast: { against: '--cds-text-primary', min: 4.5 },
  },
  { name: '--cds-skeleton-background', label: 'Skeleton background', usage: 'Skeleton base' },
  { name: '--cds-skeleton-element', label: 'Skeleton element', usage: 'Skeleton shimmer' },
  { name: '--cds-overlay', label: 'Overlay', usage: 'Scrim behind modals' },
  {
    name: '--cds-shadow',
    label: 'Shadow colour',
    usage: 'Menus, dropdowns, popovers and raised cards',
  },
];

const COLORS = new Map(
  [...COLOR_GROUPS.flatMap((group) => group.tokens), ...EXTRA_COLORS].map((token) => [
    token.name,
    token,
  ]),
);

function color(name: `--${string}`): TokenControl {
  const token = COLORS.get(name);
  if (!token) throw new Error(`Unknown colour token ${name}`);
  return { kind: 'color', token };
}

const buttonRadius: TokenControl = {
  kind: 'length',
  token: {
    name: '--cds-button-radius',
    label: 'Button radius',
    usage: 'Every Carbon button',
    defaultPx: 8,
    min: 0,
    max: 24,
    unit: 'rem',
    preview: 'radius',
  },
};

const fieldRadius: TokenControl = {
  kind: 'length',
  token: {
    name: '--pt-field-radius',
    label: 'Field radius',
    usage: 'Inputs, selects, dropdowns, search, content switcher',
    defaultPx: 8,
    min: 0,
    max: 24,
    unit: 'rem',
    preview: 'radius',
  },
};

const fieldBorder: TokenControl = {
  kind: 'length',
  token: {
    name: '--pt-field-border-width',
    label: 'Field border width',
    usage: 'Outline around inputs, dropdowns and the content switcher',
    defaultPx: 1,
    min: 1,
    max: 3,
    unit: 'px',
    preview: 'border',
  },
};

const cardRadius: TokenControl = {
  kind: 'length',
  token: {
    name: '--pt-card-radius',
    label: 'Card radius',
    usage: 'Cards, panels, hero tiles and auth forms',
    defaultPx: 16,
    min: 0,
    max: 32,
    unit: 'rem',
    preview: 'radius',
  },
};

const ring = '0 0 0 1px var(--cds-border-subtle-01)';

const cardShadow: TokenControl = {
  kind: 'choice',
  token: {
    name: '--pt-glass-shadow',
    label: 'Card shadow',
    usage: 'Elevation of cards and panels',
    preview: 'shadow',
    options: [
      { label: 'Soft (theme default)', value: null },
      { label: 'None', value: 'none' },
      { label: 'Hairline only', value: ring },
      { label: 'Raised', value: `${ring}, 0 0.75rem 2rem var(--cds-shadow)` },
      {
        label: 'Floating',
        value: `${ring}, 0 1.5rem 3rem var(--cds-shadow), 0 0.25rem 0.5rem var(--cds-shadow)`,
      },
    ],
  },
};

export const SHAPE_CONTROLS: TokenControl[] = [
  buttonRadius,
  fieldRadius,
  fieldBorder,
  cardRadius,
  cardShadow,
  color('--cds-shadow'),
];

/** The tokens each component on the Components tab reads, keyed by specimen id. */
export const COMPONENT_CONTROLS: Record<string, TokenControl[]> = {
  buttons: [
    buttonRadius,
    color('--cds-button-primary'),
    color('--cds-button-primary-hover'),
    color('--cds-button-secondary'),
    color('--cds-button-tertiary'),
    color('--cds-support-error'),
    color('--cds-text-on-color'),
    color('--cds-focus'),
  ],
  fields: [
    fieldRadius,
    fieldBorder,
    color('--cds-field-01'),
    color('--cds-field-02'),
    color('--cds-border-strong-01'),
    color('--cds-text-placeholder'),
    color('--cds-text-helper'),
    color('--cds-support-error'),
    color('--cds-focus'),
  ],
  selection: [
    color('--pt-control-edge'),
    color('--cds-layer-selected-inverse'),
    color('--cds-toggle-off'),
    color('--cds-support-success'),
    fieldRadius,
  ],
  notifications: [
    color('--cds-notification-background-info'),
    color('--cds-notification-background-success'),
    color('--cds-notification-background-warning'),
    color('--cds-notification-background-error'),
    color('--cds-support-info'),
    color('--cds-support-warning'),
    color('--cds-support-error'),
  ],
  navigation: [
    color('--cds-border-interactive'),
    color('--cds-text-primary'),
    color('--cds-text-secondary'),
    color('--cds-border-subtle-01'),
    color('--cds-interactive'),
    color('--cds-link-primary'),
    color('--cds-link-primary-hover'),
  ],
  content: [
    color('--cds-layer-01'),
    color('--cds-layer-02'),
    color('--cds-layer-hover-01'),
    color('--cds-layer-accent-01'),
    color('--cds-border-subtle-01'),
  ],
  loading: [
    color('--cds-skeleton-background'),
    color('--cds-skeleton-element'),
    color('--cds-interactive'),
  ],
  overlays: [color('--cds-overlay'), color('--cds-layer-01'), color('--cds-shadow')],
  product: [cardRadius, cardShadow, color('--cds-text-secondary')],
  status: [
    color('--cds-support-info'),
    color('--cds-support-success'),
    color('--cds-support-warning'),
    color('--cds-support-error'),
    color('--cds-layer-01'),
  ],
};
