import type { ReactNode } from 'react';
import styles from './CountryFlag.module.scss';

/**
 * National flags for the expert network's countries, drawn as small SVGs so they look the same
 * on every system (flag emoji don't render on Windows). Flag colours are part of the flags, so,
 * like the provider logos in BrandLogo, they are the one place outside src/styles/_themes.scss
 * with literal colours (ADR 0009).
 */
const FLAGS: Record<string, { name: string; art: ReactNode }> = {
  DE: {
    name: 'Germany',
    art: (
      <>
        <rect width="30" height="7" y="0" fill="#000" />
        <rect width="30" height="6" y="7" fill="#DD0000" />
        <rect width="30" height="7" y="13" fill="#FFCE00" />
      </>
    ),
  },
  PL: {
    name: 'Poland',
    art: (
      <>
        <rect width="30" height="10" fill="#FFF" />
        <rect width="30" height="10" y="10" fill="#DC143C" />
      </>
    ),
  },
  SE: { name: 'Sweden', art: nordic('#006AA7', '#FECC02') },
  DK: { name: 'Denmark', art: nordic('#C8102E', '#FFF') },
  FI: { name: 'Finland', art: nordic('#FFF', '#002F6C') },
  BE: { name: 'Belgium', art: vertical('#000', '#FDDA24', '#EF3340') },
  FR: { name: 'France', art: vertical('#0055A4', '#FFF', '#EF4135') },
  IE: { name: 'Ireland', art: vertical('#169B62', '#FFF', '#FF883E') },
  NL: { name: 'Netherlands', art: horizontal('#AE1C28', '#FFF', '#21468B') },
  AT: { name: 'Austria', art: horizontal('#C8102E', '#FFF', '#C8102E') },
  GB: {
    name: 'United Kingdom',
    art: (
      <>
        <rect width="30" height="20" fill="#012169" />
        <path d="M0 0 30 20M30 0 0 20" stroke="#FFF" strokeWidth="4" />
        <path d="M0 0 30 20M30 0 0 20" stroke="#C8102E" strokeWidth="1.6" />
        <path d="M15 0v20M0 10h30" stroke="#FFF" strokeWidth="6" />
        <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
      </>
    ),
  },
  US: {
    name: 'United States',
    art: (
      <>
        <rect width="30" height="20" fill="#B22234" />
        {[1, 3, 5, 7, 9, 11].map((stripe) => (
          <rect key={stripe} width="30" height={20 / 13} y={(stripe * 20) / 13} fill="#FFF" />
        ))}
        <rect width="12" height={(7 * 20) / 13} fill="#3C3B6E" />
      </>
    ),
  },
  TW: {
    name: 'Taiwan',
    art: (
      <>
        <rect width="30" height="20" fill="#FE0000" />
        <rect width="15" height="10" fill="#000095" />
        <circle cx="7.5" cy="5" r="2.6" fill="#FFF" />
        <circle cx="7.5" cy="5" r="1.7" fill="#000095" />
        <circle cx="7.5" cy="5" r="1.4" fill="#FFF" />
      </>
    ),
  },
  MY: {
    name: 'Malaysia',
    art: (
      <>
        <rect width="30" height="20" fill="#FFF" />
        {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
          <rect key={stripe} width="30" height={20 / 14} y={(stripe * 20) / 14} fill="#CC0001" />
        ))}
        <rect width="15" height={(8 * 20) / 14} fill="#010066" />
        <circle cx="5.6" cy="5.7" r="3.6" fill="#FC0" />
        <circle cx="6.8" cy="5.7" r="3" fill="#010066" />
        <circle cx="11" cy="5.7" r="1.6" fill="#FC0" />
      </>
    ),
  },
  SG: {
    name: 'Singapore',
    art: (
      <>
        <rect width="30" height="20" fill="#FFF" />
        <rect width="30" height="10" fill="#EF3340" />
        <circle cx="6.5" cy="5" r="3.4" fill="#FFF" />
        <circle cx="7.8" cy="5" r="3.2" fill="#EF3340" />
        <circle cx="10.5" cy="5" r="1.4" fill="#FFF" />
      </>
    ),
  },
  JP: {
    name: 'Japan',
    art: (
      <>
        <rect width="30" height="20" fill="#FFF" />
        <circle cx="15" cy="10" r="6" fill="#BC002D" />
      </>
    ),
  },
};

function vertical(a: string, b: string, c: string) {
  return (
    <>
      <rect width="10" height="20" x="0" fill={a} />
      <rect width="10" height="20" x="10" fill={b} />
      <rect width="10" height="20" x="20" fill={c} />
    </>
  );
}

function horizontal(a: string, b: string, c: string) {
  return (
    <>
      <rect width="30" height="7" y="0" fill={a} />
      <rect width="30" height="6" y="7" fill={b} />
      <rect width="30" height="7" y="13" fill={c} />
    </>
  );
}

/** A Nordic cross: the upright sits off-centre, toward the hoist. */
function nordic(field: string, cross: string) {
  return (
    <>
      <rect width="30" height="20" fill={field} />
      <rect width="4" height="20" x="9" fill={cross} />
      <rect width="30" height="4" y="8" fill={cross} />
    </>
  );
}

export function countryName(code: string): string {
  return FLAGS[code]?.name ?? code;
}

/** The short form people write, e.g. "UK" for GB; otherwise the ISO code itself. */
const SHORT_NAMES: Record<string, string> = { GB: 'UK' };

export function countryShortName(code: string): string {
  return SHORT_NAMES[code] ?? code;
}

/**
 * The country's flag and name, e.g. "🇩🇪 Germany"; unknown codes show the code alone. `sm` suits
 * small label text (a smaller flag, sitting closer to the name). `short` writes the short form
 * ("UK"), with the full name kept for hover and screen readers.
 */
export function CountryFlag({
  code,
  showName = true,
  short = false,
  size = 'md',
}: {
  code: string;
  showName?: boolean;
  short?: boolean;
  size?: 'sm' | 'md';
}) {
  const flag = FLAGS[code];
  const isSmall = size === 'sm';
  return (
    <span className={isSmall ? `${styles.root} ${styles.small}` : styles.root}>
      {flag ? (
        <svg
          className={styles.flag}
          viewBox="0 0 30 20"
          width={isSmall ? 15 : 20}
          height={isSmall ? 10 : 14}
          aria-hidden="true"
          focusable="false"
        >
          {flag.art}
        </svg>
      ) : null}
      {showName ? (
        short ? (
          <span title={flag?.name ?? code}>
            <span aria-hidden="true">{countryShortName(code)}</span>
            <span className={styles.visuallyHidden}>{flag?.name ?? code}</span>
          </span>
        ) : (
          <span>{flag?.name ?? code}</span>
        )
      ) : null}
    </span>
  );
}
