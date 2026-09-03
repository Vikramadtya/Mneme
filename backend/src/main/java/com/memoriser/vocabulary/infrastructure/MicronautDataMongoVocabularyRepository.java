package com.memoriser.vocabulary.infrastructure;

import io.micronaut.data.mongodb.annotation.MongoRepository;
import io.micronaut.data.repository.reactive.ReactorCrudRepository;
import reactor.core.publisher.Flux;

@MongoRepository
public interface MicronautDataMongoVocabularyRepository extends ReactorCrudRepository<MongoVocabularyItem, String> {
    Flux<MongoVocabularyItem> findByCreatedBy(String createdBy);
}
