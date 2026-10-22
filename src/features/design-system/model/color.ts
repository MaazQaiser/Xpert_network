type Rgb = { r: number; g: number; b: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i;

function parseRgb(value: string): Rgb | null {
  const color = value.trim();
  const hex = HEX.exec(color)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = RGB.exec(color);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  return null;
}

/** `#rrggbb` for hex or rgb(a) values (alpha dropped), `null` for anything else. */
export function toHex(value: string): string | null {
  const rgb = parseRgb(value);
  if (!rgb) return null;
  return `#${[rgb.r, rgb.g, rgb.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The picker's `#rrggbb` carrying over the alpha of the value it replaces, so translucent
 * tokens (shadow, overlay, hover fills) stay translucent.
 */
export function keepAlpha(hex: string, previous: string): string {
  const alpha = /^rgba\(.*,\s*([\d.]+)\s*\)$/i.exec(previous.trim())?.[1];
  const rgb = parseRgb(hex);
  if (!alpha || !rgb || Number(alpha) >= 1) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function luminance({ r, g, b }: Rgb) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG 2.2 contrast ratio between two opaque colours, or `null` if either can't be parsed. */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseRgb(a);
  const second = parseRgb(b);
  if (!first || !second) return null;
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** True when the browser accepts `value` as a CSS colour. */
export function isCssColor(value: string): boolean {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return CSS.supports('color', value);
  }
  return parseRgb(value) !== null;
}
