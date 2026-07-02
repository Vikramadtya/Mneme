import { create } from "zustand";

interface ReviewState {
  revealedCards: Set<string>;
  activityLogs: any[];
  reviewMode: boolean;
  reviewIndex: number;

  setRevealedCards: (cards: Set<string>) => void;
  setActivityLogs: (logs: any[]) => void;
  setReviewMode: (mode: boolean) => void;
  setReviewIndex: (index: number | ((prev: number) => number)) => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  revealedCards: new Set(),
  activityLogs: [],
  reviewMode: false,
  reviewIndex: 0,

  setRevealedCards: (cards) => set({ revealedCards: cards }),
  setActivityLogs: (logs) => set({ activityLogs: logs }),
  setReviewMode: (mode) => set({ reviewMode: mode }),
  setReviewIndex: (index) =>
    set((state) => ({
      reviewIndex:
        typeof index === "function" ? index(state.reviewIndex) : index,
    })),
}));
