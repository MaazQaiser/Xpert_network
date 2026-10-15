'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared/api';
import {
  workspaceSchema,
  type FolderInput,
  type FolderPatch,
  type ItemsPatch,
  type LabelInput,
  type Workspace,
} from '../model/workspace.schema';

export const workspaceKeys = {
  all: ['workspace'] as const,
};

export function useWorkspace() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: ({ signal }) => apiRequest('/workspace', { schema: workspaceSchema, signal }),
  });
}

/** Every workspace change answers with the whole workspace, so the cache is simply replaced. */
function useWorkspaceChange<TInput>(request: (input: TInput) => Promise<Workspace>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (workspace) => queryClient.setQueryData(workspaceKeys.all, workspace),
  });
}

export function useCreateFolder() {
  return useWorkspaceChange((input: FolderInput) =>
    apiRequest('/workspace/folders', { method: 'POST', body: input, schema: workspaceSchema }),
  );
}

export function useUpdateFolder() {
  return useWorkspaceChange(({ id, ...patch }: FolderPatch & { id: string }) =>
    apiRequest(`/workspace/folders/${id}`, {
      method: 'PATCH',
      body: patch,
      schema: workspaceSchema,
    }),
  );
}

export function useDeleteFolder() {
  return useWorkspaceChange((id: string) =>
    apiRequest(`/workspace/folders/${id}`, { method: 'DELETE', schema: workspaceSchema }),
  );
}

export function useCreateLabel() {
  return useWorkspaceChange((input: LabelInput) =>
    apiRequest('/workspace/labels', { method: 'POST', body: input, schema: workspaceSchema }),
  );
}

export function useUpdateLabel() {
  return useWorkspaceChange(({ id, ...input }: LabelInput & { id: string }) =>
    apiRequest(`/workspace/labels/${id}`, {
      method: 'PATCH',
      body: input,
      schema: workspaceSchema,
    }),
  );
}

export function useDeleteLabel() {
  return useWorkspaceChange((id: string) =>
    apiRequest(`/workspace/labels/${id}`, { method: 'DELETE', schema: workspaceSchema }),
  );
}

/** Move, label, pin, archive or rename one or more items. */
export function useUpdateItems() {
  return useWorkspaceChange((patch: ItemsPatch) =>
    apiRequest('/workspace/items', { method: 'PATCH', body: patch, schema: workspaceSchema }),
  );
}
