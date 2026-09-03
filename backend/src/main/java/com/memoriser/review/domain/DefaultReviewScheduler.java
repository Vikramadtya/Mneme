package com.memoriser.review.domain;

import com.memoriser.learning.domain.UserWordProgress;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Singleton
public class DefaultReviewScheduler implements ReviewScheduler {
    
    @Override
    public UserWordProgress calculateNextReview(UserWordProgress currentState, int reviewResult) {
        // Pseudo-FSRS logic mapping result (1=Again, 2=Hard, 3=Good, 4=Easy) to Difficulty and Stability
        double difficulty = currentState.getDifficulty();
        double stability = currentState.getStability();
        
        if (stability == 0) stability = 1.0; // Initial stability
        
        // Update Difficulty based on review result
        double difficultyDelta = (3.0 - reviewResult) * 0.5;
        difficulty = Math.max(1.0, Math.min(10.0, difficulty + difficultyDelta));
        
        // Update Stability
        if (reviewResult == 1) { // Again (Fail)
            stability = Math.max(1.0, stability * 0.3);
            currentState.setState("LEARNING");
        } else {
            double multiplier = 1.0 + (10.0 - difficulty) * 0.1;
            if (reviewResult == 4) multiplier += 0.5; // Easy bonus
            stability = stability * multiplier;
            currentState.setState("REVIEW");
        }
        
        int nextIntervalDays = (int) Math.round(stability);
        if (reviewResult == 1) {
            nextIntervalDays = 0; // Review again today
        }
        
        currentState.setDifficulty(difficulty);
        currentState.setStability(stability);
        currentState.setNextReviewAt(Instant.now().plus(nextIntervalDays, ChronoUnit.DAYS));
        
        return currentState;
    }
}
