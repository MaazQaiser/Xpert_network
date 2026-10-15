'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem } from '@carbon/react';
import styles from './PageHeader.module.scss';

export type Crumb = { label: string; href: string };

export type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Primary / secondary actions. Max one primary button. */
  actions?: ReactNode;
  /** Optional row under the title, e.g. Tabs or filters. */
  children?: ReactNode;
};

/** Breadcrumb + the page's single h1 + actions (DESIGN_SYSTEM §6). */
export function PageHeader({ title, subtitle, breadcrumbs, actions, children }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb noTrailingSlash className={styles.breadcrumb}>
          {breadcrumbs.map((crumb) => (
            <BreadcrumbItem key={crumb.href}>
              <Link href={crumb.href}>{crumb.label}</Link>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      ) : null}
      <div className={styles.row}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
