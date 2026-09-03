package com.memoriser.learning.domain;

import org.reactivestreams.Publisher;
import java.time.Instant;

public interface ReviewLogRepository {
    Publisher<ReviewLog> save(ReviewLog log);
    Publisher<ReviewLog> findByUserIdAndReviewedAtBetween(String userId, Instant start, Instant end);
}
