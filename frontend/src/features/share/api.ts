import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, fetchApi } from '../../api/client';
import type { VocabularyItem } from '../vocabulary/api';

export interface SharedCollection {
  name: string;
  description: string;
  wordCount: number;
  words: Pick<VocabularyItem, 'word' | 'definitions' | 'examples' | 'pronunciation' | 'meanings'>[];
}

/** Public: works without a session, so it skips the authenticated client. */
export function useSharedCollection(shareId: string) {
  return useQuery<SharedCollection>({
    queryKey: ['shared', shareId],
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/public/collections/${encodeURIComponent(shareId)}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'This collection does not exist or is no longer shared.' : 'Could not load this collection.');
      return res.json();
    },
  });
}

export function useImportShared() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) =>
      fetchApi<{ collectionId: string; imported: number; skipped: number }>(`/public/collections/${encodeURIComponent(shareId)}/import`, { method: 'POST' }),
    onSuccess: () => {
      for (const key of ['vocabulary', 'collections', 'dashboard', 'analytics']) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
