'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductsAction,
  getProductByIdAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from '@/lib/actions/product.actions';
import { useLang } from '@/lib/hooks/useLang';
import type { ListProductsParams } from '@/lib/zod/product.schema';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  list: (params: Partial<ListProductsParams>) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
};

// ─── useProducts ──────────────────────────────────────────────────────────────

/**
 * Purpose: Provide React Query hooks for product list with caching and mutations.
 * Params:
 *   - params: ListProductsParams — Optional filter and pagination parameters.
 * Returns:
 *   - Object with product data, mutations, and loading states.
 */
export function useProducts(params: Partial<ListProductsParams> = {}) {
  const { t } = useLang();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.list(params),
    queryFn: () => getProductsAction(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: createProductAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('[useProducts.create]', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateProductAction,
    onSuccess: (_, input: any) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      if (input?.id) {
        queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(input.id) });
      }
    },
    onError: (error: any) => {
      console.error('[useProducts.update]', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('[useProducts.delete]', error);
    },
  });

  return {
    products: (query.data?.data?.data ?? []) as any[],
    meta: query.data?.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    // mutations
    createProduct: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateProduct: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteProduct: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

// ─── useProduct (single) ──────────────────────────────────────────────────────

/**
 * Purpose: Fetch a single product by ID with React Query caching.
 * Params:
 *   - id: string — Product identifier.
 * Returns:
 *   - Object with product data and loading state.
 */
export function useProduct(id: string) {
  const query = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(id),
    queryFn: () => getProductByIdAction(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  return {
    product: query.data?.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
