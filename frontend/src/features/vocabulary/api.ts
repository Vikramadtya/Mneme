import toast from "react-hot-toast";

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';

export interface Meaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }[];
  synonyms?: string[];
  antonyms?: string[];
  createdAt?: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  meanings?: Meaning[];
  pronunciation?: string;
  audioUrl?: string;
  origin?: string;
  notes?: string;
  // Legacy flat fields
  definitions?: string[];
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  createdAt?: string;
}

export interface VocabularyCollection {
  id: string;
  name: string;
  description?: string;
  wordIds: string[];
  /** Set while the collection is shared by link. */
  shareId?: string;
}

/** Anything that changes words or collections also changes the dashboard numbers and analytics. */
function invalidateLibrary(queryClient: QueryClient) {
  for (const key of ['vocabulary', 'collections', 'dashboard', 'analytics']) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
  queryClient.invalidateQueries({ queryKey: ['learning'] }); // today's queue and per-word status
}

export function useMyVocabulary() {
  return useQuery<VocabularyItem[]>({
    queryKey: ['vocabulary'],
    queryFn: () => fetchApi('/vocabulary/me')
  });
}

export function useVocabularyItem(id: string) {
  return useQuery<VocabularyItem>({
    queryKey: ['vocabulary', id],
    queryFn: () => fetchApi(`/vocabulary/${id}`),
    enabled: !!id
  });
}

export function useAddVocabulary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ item, collectionId }: { item: Partial<VocabularyItem>, collectionId?: string }) => {
      const url = collectionId ? `/vocabulary?collectionId=${collectionId}` : '/vocabulary';
      return fetchApi(url, { method: 'POST', body: JSON.stringify(item) });
    },
    onSuccess: () => {
      invalidateLibrary(queryClient);
      toast.success('Word added successfully!');
    },
    onError: () => toast.error('Failed to add word')
  });
}

export function useUpdateVocabulary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, item, collectionId }: { id: string; item: Partial<VocabularyItem>; collectionId?: string }) => {
      const url = collectionId ? `/vocabulary/${id}?collectionId=${collectionId}` : `/vocabulary/${id}`;
      return fetchApi(url, { method: 'PUT', body: JSON.stringify(item) });
    },
    onSuccess: () => {
      invalidateLibrary(queryClient);
      toast.success('Word updated successfully!');
    },
    onError: () => toast.error('Failed to update word')
  });
}


export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, description }: { id: string; name?: string; description?: string }) => {
      const payload: { name?: string; description?: string } = {};
      if (name) payload.name = name;
      if (description !== undefined) payload.description = description;
      return fetchApi(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      invalidateLibrary(queryClient);
      toast.success('Collection updated!');
    },
    onError: () => toast.error('Failed to update collection')
  });
}

export function useDeleteVocabulary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/vocabulary/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidateLibrary(queryClient);
      toast.success('Word deleted!');
    },
    onError: () => toast.error('Failed to delete word')
  });
}

export interface BulkResult {
  created: number;
  skipped: string[];
  failed: string[];
}

export function useBulkAdd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items, collectionId }: { items: Partial<VocabularyItem>[]; collectionId?: string }) =>
      fetchApi<BulkResult>(collectionId ? `/vocabulary/bulk?collectionId=${collectionId}` : '/vocabulary/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export interface AiSuggestion {
  examples: string[];
  mnemonic: string;
  synonyms: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
}

export const requestAiSuggestion = (word: string, meaning?: string) =>
  fetchApi<AiSuggestion>('/vocabulary/ai-assist', { method: 'POST', body: JSON.stringify({ word, meaning }) });

export function useShareCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, share }: { id: string; share: boolean }) =>
      fetchApi<{ shareId?: string }>(`/collections/${id}/share`, { method: share ? 'POST' : 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useCollections() {
  return useQuery<VocabularyCollection[]>({
    queryKey: ['collections'],
    queryFn: () => fetchApi('/collections')
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collection: Partial<VocabularyCollection>) => fetchApi('/collections', { method: 'POST', body: JSON.stringify(collection) }),
    onSuccess: () => invalidateLibrary(queryClient)
  });
}

export function useUpdateCollectionWords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, wordIds }: { id: string; wordIds: string[] }) => 
      fetchApi(`/collections/${id}/words`, { method: 'PUT', body: JSON.stringify({ wordIds }) }),
    onSuccess: () => invalidateLibrary(queryClient)
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateLibrary(queryClient)
  });
}
