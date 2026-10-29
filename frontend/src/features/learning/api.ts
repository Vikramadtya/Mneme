import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';
import type { VocabularyCollection, VocabularyItem } from '../vocabulary/api';

export interface WordProgress {
  id: string;
  wordId: string;
  state: 'NEW' | 'LEARNING' | 'GRADUATED';
  difficulty: number;
  stability: number;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  lastReviewedAt?: string;
  nextReviewAt: string;
}

export interface TodayReview {
  progress: WordProgress;
  vocabulary: VocabularyItem;
}

export interface LearningStats {
  totalWords: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  graduatedCount: number;
  accuracyPercent: number;
}

export interface DashboardOverview {
  stats: LearningStats;
  collections: VocabularyCollection[];
}

export function useTodaysReviews(collectionId?: string | null) {
  return useQuery<TodayReview[]>({
    queryKey: ['learning', 'today', collectionId ?? null],
    queryFn: () => fetchApi(collectionId ? `/learning/today?collectionId=${collectionId}` : '/learning/today'),
  });
}

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => fetchApi('/learning/dashboard-overview'),
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wordId, grade }: { wordId: string; grade: number }) =>
      fetchApi<WordProgress>(`/learning/${wordId}/review`, {
        method: 'POST',
        body: JSON.stringify({ grade }),
      }),
    retry: 2,
    onSuccess: () => {
      // Only mark stale: the dashboard isn't mounted during a session, and the session keeps its own queue.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'today'], refetchType: 'none' });
    },
  });
}
