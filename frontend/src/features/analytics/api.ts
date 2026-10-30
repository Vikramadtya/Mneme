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

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  activity: ActivityData[];
  heatmap: HeatmapDay[];
  streak: { current: number; longest: number };
  today: { reviews: number; goal: number };
  totalReviews: number;
  confidence: ConfidenceData;
  collections: CollectionAnalyticsData[];
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary', timeZone],
    queryFn: () => fetchApi(`/analytics/summary?tz=${encodeURIComponent(timeZone)}`),
  });
}
