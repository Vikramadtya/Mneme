import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';

export interface ActivityData {
  date: string;
  reviews: number;
  newWords: number;
}

export interface ConfidenceData {
  high: number;
  medium: number;
  low: number;
}

export interface CollectionAnalyticsData {
  id: string;
  name: string;
  wordCount: number;
  accuracyPercent: number;
}

export function useAnalyticsSummary() {
  return useQuery<any>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => fetchApi('/analytics/summary')
  });
}
