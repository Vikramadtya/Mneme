package com.memoriser.review.domain;

import com.memoriser.learning.domain.UserWordProgress;

public interface ReviewScheduler {
    /**
     * Calculates the next review date and updates memory state (difficulty/stability).
     * @param currentState The current state of the word memory.
     * @param reviewResult 0=Again, 1=Hard, 2=Good, 3=Easy (or custom scale).
     * @return The updated progress.
     */
    UserWordProgress calculateNextReview(UserWordProgress currentState, int reviewResult);
}
