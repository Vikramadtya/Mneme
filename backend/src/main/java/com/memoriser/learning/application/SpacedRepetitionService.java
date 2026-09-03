package com.memoriser.learning.application;

import com.memoriser.learning.domain.UserWordProgress;
import jakarta.inject.Singleton;
import java.time.Instant;

@Singleton
public class SpacedRepetitionService {
    
    // Very basic SM-2 inspired mock for now
    public UserWordProgress processReview(UserWordProgress progress, int grade) {
        progress.setLastReviewedAt(Instant.now());
        progress.setReviewCount(progress.getReviewCount() + 1);
        
        if (grade >= 3) {
            progress.setSuccessCount(progress.getSuccessCount() + 1);
            progress.setState("GRADUATED");
            progress.setDifficulty(Math.max(1.0, progress.getDifficulty() - 0.5));
            progress.setStability(progress.getStability() + (grade == 4 ? 2.0 : 1.0));
            // Add days based on stability
            progress.setNextReviewAt(Instant.now().plusSeconds((long)(86400 * Math.max(1, progress.getStability()))));
        } else {
            progress.setFailureCount(progress.getFailureCount() + 1);
            progress.setState("LEARNING");
            progress.setDifficulty(Math.min(10.0, progress.getDifficulty() + 1.0));
            progress.setStability(Math.max(0.1, progress.getStability() - 0.5));
            // Review again in 10 minutes
            progress.setNextReviewAt(Instant.now().plusSeconds(600));
        }
        return progress;
    }
}
