'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  ContentSwitcher,
  InlineNotification,
  Modal,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { useThemePreference } from '@/providers/ThemeProvider';
import { routes } from '@/shared/config/routes';
import { useTokenOverrides } from '../../hooks/useTokenOverrides';
import { countOverrides, resetOverrides } from '../../model/overrides';
import { ColorTokens } from './ColorTokens';
import { ComponentGallery } from './ComponentGallery';
import { ExportModal } from './ExportModal';
import { ShapeTokens } from './ShapeTokens';
import { TypographyTokens } from './TypographyTokens';
import styles from './DesignSystemView.module.scss';

/**
 * The living design system: every token and component the app uses, rendered from the real
 * theme. Token edits apply app-wide in this browser and can be exported into src/styles.
 */
export function DesignSystemView() {
  const { theme, setPreference } = useThemePreference();
  const overrides = useTokenOverrides();
  const [dialog, setDialog] = useState<'export' | 'reset' | null>(null);
  const editCount = countOverrides(overrides);
  const scope = theme === 'g100' ? 'dark' : 'light';

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <Link href={routes.landing} className={styles.back}>
          <ArrowLeft aria-hidden="true" /> Xpert Network
        </Link>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Design system</h1>
            <p className={styles.subtitle}>
              Colours, type, shape and every component the app is built from. Edit a token and every
              screen updates.
            </p>
          </div>
          <div className={styles.actions}>
            <ContentSwitcher
              size="md"
              selectedIndex={scope === 'dark' ? 1 : 0}
              onChange={({ name }) => setPreference(name === 'dark' ? 'dark' : 'light')}
              className={styles.themeSwitch}
            >
              <Switch name="light" text="Light theme" />
              <Switch name="dark" text="Dark theme" />
            </ContentSwitcher>
            <Button kind="ghost" disabled={editCount === 0} onClick={() => setDialog('reset')}>
              Reset all
            </Button>
            <Button onClick={() => setDialog('export')}>
              Export changes{editCount > 0 ? ` (${editCount})` : ''}
            </Button>
          </div>
        </div>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Edits apply across the app in this browser."
          subtitle={`Colour edits change the ${scope} theme only; switch themes to edit the other. Export changes to make them permanent in src/styles.`}
        />
      </header>

      <div>
        <Tabs>
          <TabList aria-label="Design system sections">
            <Tab>Colours</Tab>
            <Tab>Typography</Tab>
            <Tab>Spacing and shape</Tab>
            <Tab>Components</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className={styles.panel}>
              <ColorTokens scope={scope} />
            </TabPanel>
            <TabPanel className={styles.panel}>
              <TypographyTokens />
            </TabPanel>
            <TabPanel className={styles.panel}>
              <ShapeTokens />
            </TabPanel>
            <TabPanel className={styles.panel}>
              <ComponentGallery />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <ExportModal
        open={dialog === 'export'}
        overrides={overrides}
        onClose={() => setDialog(null)}
      />
      <Modal
        open={dialog === 'reset'}
        danger
        size="xs"
        modalHeading="Reset every token?"
        primaryButtonText="Reset all"
        secondaryButtonText="Cancel"
        onRequestClose={() => setDialog(null)}
        onRequestSubmit={() => {
          resetOverrides();
          setDialog(null);
        }}
      >
        <p>
          All {editCount} edits go back to the committed theme in both light and dark. Export them
          first if you want to keep a copy.
        </p>
      </Modal>
    </main>
  );
}
