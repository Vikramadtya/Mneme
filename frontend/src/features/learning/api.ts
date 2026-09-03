import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';

export interface TodayReview {
  progress: any;
  vocabulary: any;
}

export interface LearningStats {
  totalWords: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  graduatedCount: number;
  accuracyPercent: number;
}

export function useTodaysReviews(collectionId?: string | null) {
  return useQuery<TodayReview[]>({
    queryKey: ['learning', 'today', collectionId],
    queryFn: () => fetchApi(collectionId ? `/learning/today?collectionId=${collectionId}` : '/learning/today')
  });
}

export function useLearningStats() {
  return useQuery<LearningStats>({
    queryKey: ['learning', 'stats'],
    queryFn: () => fetchApi('/learning/stats')
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wordId, grade }: { wordId: string; grade: number }) => 
      fetchApi(`/learning/${wordId}/review`, {
        method: 'POST',
        body: JSON.stringify({ grade })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'stats'] });
    }
  });
}
