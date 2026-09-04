package com.memoriser.vocabulary.domain;

import org.reactivestreams.Publisher;

public interface VocabularyItemRepository {
    Publisher<VocabularyItem> save(VocabularyItem item);
    Publisher<VocabularyItem> update(VocabularyItem item);
    Publisher<Void> deleteById(String id);
    Publisher<VocabularyItem> findById(String id);
    Publisher<VocabularyItem> findByCreatedBy(String createdBy);
    Publisher<VocabularyItem> findByCreatedByAndCreatedAtGreaterThanEquals(String createdBy, java.time.Instant createdAt);
}
