'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStoresAction,
  getStoreByIdAction,
  createStoreAction,
  updateStoreAction,
  deleteStoreAction,
  syncStoreAction,
} from '@/lib/actions/store.actions';
import { useLang } from '@/lib/hooks/useLang';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const STORE_QUERY_KEYS = {
  all: ['stores'] as const,
  list: (params?: object) => ['stores', 'list', params ?? {}] as const,
  detail: (id: string) => ['stores', 'detail', id] as const,
};

// ─── useStores ────────────────────────────────────────────────────────────────

export interface UseStoresParams {
  platform?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Purpose: Provide React Query hooks for store list operations with caching.
 * Params:
 *   - params: UseStoresParams — Optional filter and pagination parameters.
 * Returns:
 *   - Object with stores data, mutations, and loading states.
 */
export function useStores(params: UseStoresParams = {}) {
  const { t } = useLang();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: STORE_QUERY_KEYS.list(params),
    queryFn: () => getStoresAction(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: createStoreAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('[useStores.create]', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      updateStoreAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('[useStores.update]', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStoreAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('[useStores.delete]', error);
    },
  });

  const syncMutation = useMutation({
    mutationFn: ({ storeId, options }: { storeId: string; options?: object }) =>
      syncStoreAction(storeId, options),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEYS.detail(storeId) });
    },
    onError: (error: any) => {
      console.error('[useStores.sync]', error);
    },
  });

  return {
    stores: (query.data?.data?.data ?? []) as any[],
    meta: query.data?.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    // mutations
    createStore: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createResult: createMutation.data,
    updateStore: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateResult: updateMutation.data,
    deleteStore: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    syncStore: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
  };
}

// ─── useStore (single) ────────────────────────────────────────────────────────

/**
 * Purpose: Fetch a single store by ID with React Query caching.
 * Params:
 *   - id: string — Store identifier.
 * Returns:
 *   - Object with store data and loading state.
 */
export function useStore(id: string) {
  const query = useQuery({
    queryKey: STORE_QUERY_KEYS.detail(id),
    queryFn: () => getStoreByIdAction(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  return {
    store: query.data?.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
