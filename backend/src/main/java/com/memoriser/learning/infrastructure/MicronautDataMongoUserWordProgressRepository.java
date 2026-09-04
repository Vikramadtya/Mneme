package com.memoriser.learning.infrastructure;

import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.time.Instant;

@MongoRepository
public interface MicronautDataMongoUserWordProgressRepository extends ReactorCrudRepository<MongoUserWordProgress, String> {
    Mono<MongoUserWordProgress> findByUserIdAndWordId(String userId, String wordId);
    Flux<MongoUserWordProgress> findByUserIdAndNextReviewAtLessThanEquals(String userId, Instant nextReviewAt);
    Flux<MongoUserWordProgress> findByUserId(String userId);
}
