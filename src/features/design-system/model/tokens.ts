/**
 * Catalogue of the tokens the design system page shows and can override at runtime.
 * Names are the Carbon custom properties the compiled styles read (`var(--cds-…)`), so an
 * override reaches every component in the app without touching component code.
 */

export type ColorToken = {
  name: `--${string}`;
  label: string;
  usage: string;
  /** Token this one must stay readable against, and the WCAG minimum ratio. */
  contrast?: { against: `--${string}`; min: 3 | 4.5 };
};

export type ColorGroup = { id: string; title: string; description: string; tokens: ColorToken[] };

const onBackground = (min: 3 | 4.5) => ({ against: '--cds-background' as const, min });

export const COLOR_GROUPS: ColorGroup[] = [
  {
    id: 'actions',
    title: 'Brand and actions',
    description:
      'Buttons, the accent and focus. Primary buttons are black; orange marks links and the active item.',
    tokens: [
      {
        name: '--cds-button-primary',
        label: 'Button primary',
        usage: 'Primary button fill',
        contrast: { against: '--cds-text-on-color', min: 4.5 },
      },
      {
        name: '--cds-button-primary-hover',
        label: 'Button primary hover',
        usage: 'Primary button on hover',
      },
      {
        name: '--cds-button-secondary',
        label: 'Button secondary',
        usage: 'Secondary button fill',
        contrast: { against: '--cds-text-on-color', min: 4.5 },
      },
      {
        name: '--cds-button-tertiary',
        label: 'Button tertiary',
        usage: 'Tertiary button outline and text',
      },
      {
        name: '--cds-interactive',
        label: 'Interactive',
        usage: 'Accent: selected states, progress, sliders',
      },
      {
        name: '--cds-border-interactive',
        label: 'Border interactive',
        usage: 'Active tab and selected tile edge',
      },
      {
        name: '--cds-focus',
        label: 'Focus',
        usage: 'Focus ring on every control',
        contrast: onBackground(3),
      },
      {
        name: '--cds-highlight',
        label: 'Highlight',
        usage: 'Soft accent tint behind highlighted rows',
      },
    ],
  },
  {
    id: 'text',
    title: 'Text and icons',
    description:
      'Body copy, secondary text and icons. Text needs 4.5:1 on the page; icons need 3:1.',
    tokens: [
      {
        name: '--cds-text-primary',
        label: 'Text primary',
        usage: 'Headings and body copy',
        contrast: onBackground(4.5),
      },
      {
        name: '--cds-text-secondary',
        label: 'Text secondary',
        usage: 'Subtitles, metadata, labels',
        contrast: onBackground(4.5),
      },
      {
        name: '--cds-text-helper',
        label: 'Text helper',
        usage: 'Helper text under fields',
        contrast: onBackground(4.5),
      },
      {
        name: '--cds-text-placeholder',
        label: 'Text placeholder',
        usage: 'Placeholder text in fields',
      },
      {
        name: '--cds-text-on-color',
        label: 'Text on colour',
        usage: 'Text on filled buttons and tags',
      },
      {
        name: '--cds-icon-primary',
        label: 'Icon primary',
        usage: 'Default icons',
        contrast: onBackground(3),
      },
      {
        name: '--cds-icon-secondary',
        label: 'Icon secondary',
        usage: 'Quiet icons',
        contrast: onBackground(3),
      },
    ],
  },
  {
    id: 'links',
    title: 'Links',
    description: 'Inline and standalone links.',
    tokens: [
      {
        name: '--cds-link-primary',
        label: 'Link primary',
        usage: 'Links',
        contrast: onBackground(4.5),
      },
      {
        name: '--cds-link-primary-hover',
        label: 'Link primary hover',
        usage: 'Links on hover',
        contrast: onBackground(4.5),
      },
      { name: '--cds-link-visited', label: 'Link visited', usage: 'Visited links' },
    ],
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    description: 'Page, panels and fields. Nested surfaces step from layer 01 to layer 02.',
    tokens: [
      {
        name: '--cds-background',
        label: 'Background',
        usage: 'Page background under the gradient',
      },
      { name: '--cds-layer-01', label: 'Layer 01', usage: 'Side nav, cards, panels' },
      { name: '--cds-layer-hover-01', label: 'Layer hover 01', usage: 'Hovered rows and cards' },
      { name: '--cds-layer-02', label: 'Layer 02', usage: 'Surfaces nested inside layer 01' },
      { name: '--cds-field-01', label: 'Field 01', usage: 'Inputs on the page' },
      { name: '--cds-field-02', label: 'Field 02', usage: 'Inputs inside panels' },
      {
        name: '--cds-layer-selected-inverse',
        label: 'Layer selected inverse',
        usage: 'Selected switcher segment, slider fill',
      },
      {
        name: '--cds-toggle-off',
        label: 'Toggle off',
        usage: 'Toggle track when off',
        contrast: onBackground(3),
      },
    ],
  },
  {
    id: 'borders',
    title: 'Borders',
    description: 'Hairlines between content and the 3:1 outline around fields.',
    tokens: [
      {
        name: '--cds-border-subtle-01',
        label: 'Border subtle 01',
        usage: 'Dividers and table rules',
      },
      {
        name: '--cds-border-strong-01',
        label: 'Border strong 01',
        usage: 'Field, dropdown and switcher outlines',
        contrast: onBackground(3),
      },
    ],
  },
  {
    id: 'status',
    title: 'Status',
    description: 'Errors, success, warnings and info. Always pair with an icon and text.',
    tokens: [
      {
        name: '--cds-support-error',
        label: 'Support error',
        usage: 'Errors and destructive states',
        contrast: onBackground(3),
      },
      {
        name: '--cds-support-success',
        label: 'Support success',
        usage: 'Success and completion',
        contrast: onBackground(3),
      },
      {
        name: '--cds-support-warning',
        label: 'Support warning',
        usage: 'Warnings and low balances',
      },
      {
        name: '--cds-support-info',
        label: 'Support info',
        usage: 'Neutral information',
        contrast: onBackground(3),
      },
    ],
  },
];

export type TypeToken = {
  /** Carbon type token, e.g. `heading-05`. */
  id: string;
  usage: string;
  sample: string;
  /** Carbon v11 defaults: size in rem, unitless line height, numeric weight. */
  defaults: { fontSize: number; lineHeight: number; fontWeight: number };
};

export const TYPE_TOKENS: TypeToken[] = [
  {
    id: 'heading-07',
    usage: 'Marketing hero only',
    sample: 'Expert-backed research',
    defaults: { fontSize: 3.375, lineHeight: 1.19, fontWeight: 300 },
  },
  {
    id: 'heading-06',
    usage: 'Home and hero titles',
    sample: 'What do you want to learn?',
    defaults: { fontSize: 2.625, lineHeight: 1.199, fontWeight: 300 },
  },
  {
    id: 'heading-05',
    usage: 'Page title, one per page',
    sample: 'Coffee chains in Riyadh',
    defaults: { fontSize: 2, lineHeight: 1.25, fontWeight: 400 },
  },
  {
    id: 'heading-04',
    usage: 'Section heading',
    sample: 'Market entry brief',
    defaults: { fontSize: 1.75, lineHeight: 1.28572, fontWeight: 400 },
  },
  {
    id: 'heading-03',
    usage: 'Section heading',
    sample: 'Competitive landscape',
    defaults: { fontSize: 1.25, lineHeight: 1.4, fontWeight: 400 },
  },
  {
    id: 'heading-02',
    usage: 'Card and panel title',
    sample: 'Qahwa House expansion report',
    defaults: { fontSize: 1, lineHeight: 1.5, fontWeight: 600 },
  },
  {
    id: 'heading-01',
    usage: 'Small headings, table headers',
    sample: 'Interview summary',
    defaults: { fontSize: 0.875, lineHeight: 1.42857, fontWeight: 600 },
  },
  {
    id: 'body-02',
    usage: 'Long-form reading: reports, transcripts',
    sample:
      'Specialty coffee demand in Riyadh grew fastest in mixed-use districts, where three former operators expect rents to stabilise within a year.',
    defaults: { fontSize: 1, lineHeight: 1.5, fontWeight: 400 },
  },
  {
    id: 'body-01',
    usage: 'Default UI text',
    sample: 'Credits are only charged when the report is delivered to your workspace.',
    defaults: { fontSize: 0.875, lineHeight: 1.42857, fontWeight: 400 },
  },
  {
    id: 'body-compact-01',
    usage: 'Dense UI: tables, menus',
    sample: 'Delivered 12 Oct · 24 pages · 6 experts',
    defaults: { fontSize: 0.875, lineHeight: 1.28572, fontWeight: 400 },
  },
  {
    id: 'label-01',
    usage: 'Field labels, captions',
    sample: 'Target market',
    defaults: { fontSize: 0.75, lineHeight: 1.33333, fontWeight: 400 },
  },
  {
    id: 'helper-text-01',
    usage: 'Helper text under fields',
    sample: 'Use the city or region you plan to enter.',
    defaults: { fontSize: 0.75, lineHeight: 1.33333, fontWeight: 400 },
  },
  {
    id: 'code-02',
    usage: 'Code blocks',
    sample: 'brief_7f3a · report_qahwa_2026',
    defaults: { fontSize: 0.875, lineHeight: 1.42857, fontWeight: 400 },
  },
  {
    id: 'code-01',
    usage: 'IDs and citations',
    sample: 'REQ-2041',
    defaults: { fontSize: 0.75, lineHeight: 1.33333, fontWeight: 400 },
  },
];

export const FONT_WEIGHTS = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Regular (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semibold (600)' },
  { value: 700, label: 'Bold (700)' },
] as const;

export const typeVar = (id: string, property: 'font-size' | 'line-height' | 'font-weight') =>
  `--cds-${id}-${property}` as const;

/** Carbon spacing scale `$spacing-01 … $spacing-13`, in px. */
export const SPACING_SCALE = [2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160] as const;
