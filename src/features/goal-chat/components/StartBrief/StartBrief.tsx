'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorState, PageLoading } from '@/shared/ui';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useCreateBrief } from '../../api/queries';
import type { GoalType } from '../../model/brief.schema';

/** /ask: creates a draft brief, then opens its goal chat (with a preset goal from F1). */
export function StartBrief({ goal = null }: { goal?: GoalType | null }) {
  const router = useRouter();
  const create = useCreateBrief();
  const requested = useRef(false);
  const { mutate } = create;
  const briefHref = (id: string) =>
    goal ? `${routes.client.brief(id)}?goal=${goal}` : routes.client.brief(id);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    mutate(undefined, { onSuccess: (brief) => router.replace(briefHref(brief.id)) });
    // Runs once; `briefHref` only depends on the initial goal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutate, router]);

  if (create.isError) {
    return (
      <ErrorState
        title="Couldn’t start a new brief"
        message={toUserMessage(create.error)}
        onRetry={() =>
          mutate(undefined, { onSuccess: (brief) => router.replace(briefHref(brief.id)) })
        }
      />
    );
  }
  return <PageLoading description="Starting a new research brief…" inShell />;
}
