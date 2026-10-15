'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, InlineNotification, RadioTile, Stack, TileGroup } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { toUserMessage } from '@/shared/api';
import { useLogin } from '../../api/useLogin';
import { ROLE_HOME } from '../../model/session.schema';
import styles from './RoleSelect.module.scss';

type Choice = 'client' | 'expert';

const CHOICES: Record<Choice, { title: string; description: string; personaId: 'ayesha' | 'sara' }> = {
  client: {
    title: 'I need research',
    description: 'Describe a goal, buy expert-backed reports, or request custom research.',
    personaId: 'ayesha',
  },
  expert: {
    title: 'I’m an expert',
    description: 'Answer open calls and get paid for interviews on topics you know.',
    personaId: 'sara',
  },
};

/** F0 role select. Prototype: each role continues as its demo persona. */
export function RoleSelect() {
  const router = useRouter();
  const login = useLogin();
  const [choice, setChoice] = useState<Choice>('client');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    try {
      const session = await login.mutateAsync({ personaId: CHOICES[choice].personaId });
      if (session.user) router.push(ROLE_HOME[session.user.role]);
    } catch (err) {
      setError(toUserMessage(err));
    }
  };

  return (
    <Stack gap={6}>
      {error ? <InlineNotification kind="error" title="Couldn’t continue" subtitle={error} lowContrast /> : null}
      <TileGroup
        legend="How will you use Proptyop?"
        name="role"
        valueSelected={choice}
        onChange={(value) => setChoice(value as Choice)}
      >
        {(Object.keys(CHOICES) as Choice[]).map((key) => (
          <RadioTile key={key} id={`role-${key}`} value={key} className={styles.tile}>
            <span className={styles.title}>{CHOICES[key].title}</span>
            <span className={styles.description}>{CHOICES[key].description}</span>
          </RadioTile>
        ))}
      </TileGroup>
      <div>
        <Button renderIcon={ArrowRight} onClick={() => void handleContinue()} disabled={login.isPending}>
          Continue
        </Button>
      </div>
    </Stack>
  );
}
