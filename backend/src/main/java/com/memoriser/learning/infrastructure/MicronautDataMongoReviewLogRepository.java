package com.memoriser.learning.infrastructure;

import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;

import java.time.Instant;

@MongoRepository
public interface MicronautDataMongoReviewLogRepository extends ReactorCrudRepository<MongoReviewLog, String> {
    Flux<MongoReviewLog> findByUserIdAndReviewedAtBetween(String userId, Instant start, Instant end);
}
