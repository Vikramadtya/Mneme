import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  lapses?: number;
  lastReviewedAt?: string;
  nextReviewAt: string;
}

export type Rating = 1 | 2 | 3 | 4;
export type ReviewMode = 'flip' | 'reverse' | 'typed' | 'cloze';

export interface TodayReview {
  progress: WordProgress;
  vocabulary: VocabularyItem;
  /** Days until the card returns for each rating. */
  intervals: Record<Rating, number>;
  leech: boolean;
}

export interface WordStatus {
  wordId: string;
  state: 'NEW' | 'LEARNING' | 'GRADUATED';
  nextReviewAt: string;
  reviewCount: number;
  lapses: number;
  leech: boolean;
}

export interface LearningStats {
  totalWords: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  graduatedCount: number;
  leechCount: number;
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

export function useWordStatuses() {
  return useQuery<WordStatus[]>({
    queryKey: ['learning', 'progress'],
    queryFn: () => fetchApi('/learning/progress'),
  });
}

/** Marks cached numbers stale after reviews; the session keeps its own queue, so it is not refetched mid-session. */
export function refreshAfterReview(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
  queryClient.invalidateQueries({ queryKey: ['learning', 'progress'] });
  queryClient.invalidateQueries({ queryKey: ['learning', 'today'], refetchType: 'none' });
}
