'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import type { Role } from '@/features/auth';
import { PageHeader } from '@/shared/ui';
import { AppearancePanel } from './AppearancePanel';
import { ExpertProfilePanel } from './ExpertProfilePanel';
import { NotificationsPanel } from './NotificationsPanel';
import { ProfilePanel } from './ProfilePanel';
import { SecurityPanel } from './SecurityPanel';
import styles from './Settings.module.scss';

type TabId = 'expertise' | 'profile' | 'notifications' | 'security' | 'appearance';

const TABS: Record<Exclude<Role, 'admin'>, { id: TabId; label: string }[]> = {
  client: [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'appearance', label: 'Appearance' },
  ],
  expert: [
    { id: 'expertise', label: 'Expert profile' },
    { id: 'profile', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'appearance', label: 'Appearance' },
  ],
};

type SettingsViewProps = { role: Exclude<Role, 'admin'> };

/** F17 profile & settings. The tab lives in the URL (`?tab=notifications`) so it can be linked. */
export function SettingsView(props: SettingsViewProps) {
  return (
    <Suspense>
      <SettingsTabs {...props} />
    </Suspense>
  );
}

function SettingsTabs({ role }: SettingsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabs = TABS[role];
  const requested = tabs.findIndex((t) => t.id === searchParams.get('tab'));
  const selectedIndex = requested === -1 ? 0 : requested;

  const panel = (id: TabId) => {
    switch (id) {
      case 'expertise':
        return <ExpertProfilePanel />;
      case 'profile':
        return <ProfilePanel role={role} />;
      case 'notifications':
        return <NotificationsPanel role={role} />;
      case 'security':
        return <SecurityPanel />;
      case 'appearance':
        return <AppearancePanel />;
    }
  };

  return (
    <div className={styles.root}>
      <PageHeader
        title={role === 'expert' ? 'Profile and settings' : 'Settings'}
        subtitle="Changes save when you select Save. Theme changes apply straight away."
      />
      <Tabs
        selectedIndex={selectedIndex}
        onChange={({ selectedIndex: next }) => {
          const tab = tabs[next];
          if (tab) router.replace(`${pathname}?tab=${tab.id}`, { scroll: false });
        }}
      >
        <TabList aria-label="Settings sections">
          {tabs.map((tab) => (
            <Tab key={tab.id}>{tab.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabs.map((tab, index) => (
            <TabPanel key={tab.id} className={styles.panel}>
              {index === selectedIndex ? panel(tab.id) : null}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
}
