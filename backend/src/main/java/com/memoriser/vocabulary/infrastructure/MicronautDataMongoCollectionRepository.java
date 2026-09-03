package com.memoriser.vocabulary.infrastructure;

import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;

@MongoRepository
public interface MicronautDataMongoCollectionRepository extends ReactorCrudRepository<MongoVocabularyCollection, String> {
    Flux<MongoVocabularyCollection> findByUserId(String userId);
}
