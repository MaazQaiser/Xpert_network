import { EmphasisText } from '@/shared/ai';
import styles from './AdminHome.module.scss';

/** Scio writes **bold**; our emphasis markup is [[bold]]. A half-streamed ** waits for its pair. */
function toEmphasis(line: string): string {
  const marked = line.replace(/\*\*(.+?)\*\*/g, '[[$1]]');
  return marked.replace(/\*\*[^*]*$/, (rest) => rest.slice(2));
}

type Block = { kind: 'paragraph'; lines: string[] } | { kind: 'list'; items: string[] };

// A bullet, including one whose text hasn't streamed in yet ("- ").
const BULLET = /^\s*[-•*](\s+|$)/;

/** Paragraphs (split by blank lines) and "- " bullet lists; nothing else is formatted. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    const last = blocks.at(-1);
    if (!line.trim()) {
      blocks.push({ kind: 'paragraph', lines: [] });
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, '');
      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else if (last?.kind === 'paragraph') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'paragraph', lines: [line] });
    }
  }
  return blocks.filter((b) => (b.kind === 'list' ? b.items.length : b.lines.length) > 0);
}

/** Scio's answer text, as it streams in and once it's done. Never renders HTML. */
export function ScioText({ text }: { text: string }) {
  return (
    <div className={styles.scioText}>
      {toBlocks(text).map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index} className={styles.scioList}>
            {block.items.map((item, i) => (
              <li key={i}>
                <EmphasisText text={toEmphasis(item)} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            {block.lines.map((line, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                <EmphasisText text={toEmphasis(line)} />
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
