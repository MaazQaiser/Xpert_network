import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/providers/AppProviders';
import { PrototypeToolbar } from '@/features/prototype-toolbar';
import { env } from '@/shared/config/env';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: { default: 'Xpert Network', template: '%s · Xpert Network' },
  description: 'Expert-backed research for investors and businesses expanding into new markets.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-carbon-theme="white" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
          {env.isPrototype ? <PrototypeToolbar /> : null}
        </AppProviders>
      </body>
    </html>
  );
}
