'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, RadioTile, Stack, TileGroup } from '@carbon/react';
import { ChartLineData, Microphone } from '@carbon/icons-react';
import { routes } from '@/shared/config/routes';
import type { SignUpRole } from '../../model/session.schema';
import styles from './RoleSelect.module.scss';

const ROLE_ICONS = { client: ChartLineData, expert: Microphone } as const;

export const ROLE_CHOICES: Record<SignUpRole, { title: string; description: string }> = {
  client: {
    title: 'I need research',
    description: 'Describe a goal, buy expert-backed reports, or request custom research.',
  },
  expert: {
    title: 'I’m an expert',
    description: 'Answer open calls and get paid for interviews on topics you know.',
  },
};

/** F0 role select — step 1 of sign-up. Continues to the account form for that role. */
export function RoleSelect({ initialRole = 'client' }: { initialRole?: SignUpRole }) {
  const router = useRouter();
  const [choice, setChoice] = useState<SignUpRole>(initialRole);

  return (
    <Stack gap={6}>
      <TileGroup
        legend="How will you use Xpert Network?"
        name="role"
        valueSelected={choice}
        onChange={(value) => setChoice(value as SignUpRole)}
      >
        {(Object.keys(ROLE_CHOICES) as SignUpRole[]).map((key) => {
          const Icon = ROLE_ICONS[key];
          return (
            <RadioTile key={key} id={`role-${key}`} value={key} className={styles.tile}>
              <span className={styles.content}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span>
                  <span className={styles.title}>{ROLE_CHOICES[key].title}</span>
                  <span className={styles.description}>{ROLE_CHOICES[key].description}</span>
                </span>
              </span>
            </RadioTile>
          );
        })}
      </TileGroup>
      <div>
        <Button onClick={() => router.push(routes.signUpAs(choice))}>Continue</Button>
      </div>
    </Stack>
  );
}
