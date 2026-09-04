package com.memoriser.learning.domain;

import org.reactivestreams.Publisher;
import java.time.Instant;

public interface UserWordProgressRepository {
    Publisher<UserWordProgress> save(UserWordProgress progress);
    Publisher<UserWordProgress> findByUserIdAndWordId(String userId, String wordId);
    Publisher<UserWordProgress> findDueReviews(String userId, Instant before);
    Publisher<UserWordProgress> findByUserId(String userId);
}
