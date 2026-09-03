package com.memoriser.user.infrastructure;

import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Mono;

@MongoRepository
public interface MicronautDataMongoUserRepository extends ReactorCrudRepository<MongoUser, String> {
    Mono<MongoUser> findByEmail(String email);
    Mono<MongoUser> findByGoogleSubjectId(String googleSubjectId);
}
