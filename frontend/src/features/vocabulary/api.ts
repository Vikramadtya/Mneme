import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';

export interface Meaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
  antonyms?: string[];
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
}

export interface VocabularyCollection {
  id: string;
  name: string;
  description?: string;
  wordIds: string[];
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
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    }
  });
}

export function useUpdateVocabulary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, item, collectionId }: { id: string; item: Partial<VocabularyItem>; collectionId?: string }) => {
      const url = collectionId ? `/vocabulary/${id}?collectionId=${collectionId}` : `/vocabulary/${id}`;
      return fetchApi(url, { method: 'PUT', body: JSON.stringify(item) });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      queryClient.invalidateQueries({ queryKey: ['vocabulary', variables.id] });
      if (variables.collectionId) {
         queryClient.invalidateQueries({ queryKey: ['collections'] });
      }
    }
  });
}

export function useDeleteVocabulary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/vocabulary/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
        queryClient.invalidateQueries({ queryKey: ['collections'] });
    }
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useUpdateCollectionWords() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, wordIds }: { id: string; wordIds: string[] }) => 
      fetchApi(`/collections/${id}/words`, { method: 'PUT', body: JSON.stringify({ wordIds }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] })
  });
}
