import Link from 'next/link';
import styles from './status-page.module.scss';

export default function NotFound() {
  return (
    <main className={styles.root}>
      <h1 className={styles.title}>We couldn’t find that page</h1>
      <p className={styles.body}>The link may be out of date, or the page has moved.</p>
      <Link href="/">Go to the Proptyop home page</Link>
    </main>
  );
}
