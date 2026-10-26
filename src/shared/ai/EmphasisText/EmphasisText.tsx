import styles from './EmphasisText.module.scss';

// **name** and [[count]] → bold · [[!count]] → bold in blue (the one that needs you).
const MARKS = /(\*\*.+?\*\*|\[\[!?.+?\]\])/g;

type Token =
  | { kind: 'word'; value: string }
  | { kind: 'space'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'pill'; value: string; isKey: boolean };

/** Words, spaces and whole marks, in order. A mark is one token, so it never appears half-typed. */
function tokenize(text: string): Token[] {
  return text.split(MARKS).flatMap((part): Token[] => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return [{ kind: 'strong', value: part.slice(2, -2) }];
    }
    if (part.startsWith('[[') && part.endsWith(']]') && part.length > 4) {
      const isKey = part[2] === '!';
      return [{ kind: 'pill', value: part.slice(isKey ? 3 : 2, -2), isKey }];
    }
    return part
      .split(/(\s+)/)
      .filter(Boolean)
      .map((value) => (/^\s+$/.test(value) ? { kind: 'space', value } : { kind: 'word', value }));
  });
}

/** How many steps it takes to stream this text (spaces don't count). */
export function streamLength(text: string): number {
  return tokenize(text).filter((token) => token.kind !== 'space').length;
}

/**
 * AI answer text with its key facts in bold, and the count that needs the PM in blue
 * ("[[3 new projects]] came in. Start with **PRJ-1042**."). Everything else stays plain text. It never renders HTML,
 * so model output can't inject markup (AI_NATIVE §6).
 *
 * Pass `shown` to stream it: only the first `shown` words and marks appear, each fading in.
 */
export function EmphasisText({ text, shown }: { text: string; shown?: number }) {
  const isStreaming = shown !== undefined;
  // Each token's place in the stream: words and marks count, spaces share the word before them.
  const tokens = tokenize(text);
  const steps = tokens.map(
    (_, index) => tokens.slice(0, index + 1).filter((t) => t.kind !== 'space').length,
  );
  return (
    <>
      {tokens.map((token, index) => {
        if (isStreaming && (steps[index] ?? 0) > shown) return null;
        const fresh = isStreaming ? styles.fresh : undefined;
        switch (token.kind) {
          case 'space':
            return token.value;
          case 'word':
            return isStreaming ? (
              <span key={index} className={fresh}>
                {token.value}
              </span>
            ) : (
              token.value
            );
          case 'strong':
            return (
              <strong key={index} className={fresh ? `${styles.strong} ${fresh}` : styles.strong}>
                {token.value}
              </strong>
            );
          case 'pill':
            // Counts read as bold text, no chip; the one that needs the PM is also blue.
            return (
              <strong
                key={index}
                className={[styles.strong, token.isKey ? styles.key : '', fresh ?? '']
                  .filter(Boolean)
                  .join(' ')}
              >
                {token.value}
              </strong>
            );
        }
      })}
    </>
  );
}
