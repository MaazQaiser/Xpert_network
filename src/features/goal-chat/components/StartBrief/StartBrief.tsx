'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { InlineLoading } from '@carbon/react';
import { ErrorState } from '@/shared/ui';
import { toUserMessage } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useCreateBrief } from '../../api/queries';

/** /ask: creates a draft brief, then opens its goal chat. */
export function StartBrief() {
  const router = useRouter();
  const create = useCreateBrief();
  const requested = useRef(false);
  const { mutate } = create;

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    mutate(undefined, { onSuccess: (brief) => router.replace(routes.client.brief(brief.id)) });
  }, [mutate, router]);

  if (create.isError) {
    return (
      <ErrorState
        title="Couldn’t start a new brief"
        message={toUserMessage(create.error)}
        onRetry={() =>
          mutate(undefined, { onSuccess: (brief) => router.replace(routes.client.brief(brief.id)) })
        }
      />
    );
  }
  return <InlineLoading status="active" description="Starting a new research brief…" />;
}
