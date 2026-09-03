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

export function useActivityAnalytics() {
  return useQuery<{ activity: ActivityData[] }>({
    queryKey: ['analytics', 'activity'],
    queryFn: () => fetchApi('/analytics/activity')
  });
}

export function useConfidenceAnalytics() {
  return useQuery<ConfidenceData>({
    queryKey: ['analytics', 'confidence'],
    queryFn: () => fetchApi('/analytics/confidence')
  });
}

export function useCollectionsAnalytics() {
  return useQuery<CollectionAnalyticsData[]>({
    queryKey: ['analytics', 'collections'],
    queryFn: () => fetchApi('/analytics/collections')
  });
}
