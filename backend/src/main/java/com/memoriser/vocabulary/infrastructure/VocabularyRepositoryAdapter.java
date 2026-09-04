package com.memoriser.vocabulary.infrastructure;

import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import java.util.List;
import java.time.Instant;

@Singleton
public class VocabularyRepositoryAdapter implements VocabularyItemRepository {

    private final MicronautDataMongoVocabularyRepository mongoRepository;

    public VocabularyRepositoryAdapter(MicronautDataMongoVocabularyRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }

    @Override
    public Publisher<VocabularyItem> save(VocabularyItem item) {
        MongoVocabularyItem mongoModel = toMongoModel(item);
        if (mongoModel.getCreatedAt() == null) {
            mongoModel.setCreatedAt(Instant.now());
        }
        mongoModel.setUpdatedAt(Instant.now());
        return mongoRepository.save(mongoModel).map(this::toDomainModel);
    }

    @Override
    public Publisher<VocabularyItem> update(VocabularyItem item) {
        MongoVocabularyItem mongoModel = toMongoModel(item);
        mongoModel.setUpdatedAt(Instant.now());
        return mongoRepository.update(mongoModel).map(this::toDomainModel);
    }

    @Override
    public Publisher<VocabularyItem> findById(String id) {
        return mongoRepository.findById(id).map(this::toDomainModel);
    }

    @Override
    public Publisher<VocabularyItem> findByCreatedBy(String createdBy) {
        return mongoRepository.findByCreatedBy(createdBy).map(this::toDomainModel);
    }

    @Override
    public Publisher<VocabularyItem> findByCreatedByAndCreatedAtGreaterThanEquals(String createdBy, Instant createdAt) {
        return mongoRepository.findByCreatedByAndCreatedAtGreaterThanEquals(createdBy, createdAt).map(this::toDomainModel);
    }

    @Override
    public Publisher<Void> deleteById(String id) {
        return reactor.core.publisher.Mono.from(mongoRepository.deleteById(id)).then();
    }

    private MongoVocabularyItem toMongoModel(VocabularyItem item) {
        MongoVocabularyItem mongo = new MongoVocabularyItem();
        mongo.setId(item.getId());
        mongo.setWord(item.getWord());
        mongo.setMeanings(item.getMeanings());
        mongo.setPronunciation(item.getPronunciation());
        mongo.setAudioUrl(item.getAudioUrl());
        mongo.setOrigin(item.getOrigin());
        mongo.setNotes(item.getNotes());
        mongo.setDefinitions(item.getDefinitions());
        mongo.setExamples(item.getExamples());
        mongo.setDifficulty(item.getDifficulty());
        mongo.setTopics(item.getTopics());
        mongo.setSynonyms(item.getSynonyms());
        mongo.setAntonyms(item.getAntonyms());
        mongo.setRelatedWords(item.getRelatedWords());
        mongo.setCreatedBy(item.getCreatedBy());
        mongo.setCreatedAt(item.getCreatedAt());
        mongo.setUpdatedAt(item.getUpdatedAt());
        return mongo;
    }

    private VocabularyItem toDomainModel(MongoVocabularyItem mongo) {
        VocabularyItem item = new VocabularyItem();
        item.setId(mongo.getId());
        item.setWord(mongo.getWord());
        item.setMeanings(mongo.getMeanings());
        item.setPronunciation(mongo.getPronunciation());
        item.setAudioUrl(mongo.getAudioUrl());
        item.setOrigin(mongo.getOrigin());
        item.setNotes(mongo.getNotes());
        item.setDefinitions(mongo.getDefinitions());
        item.setExamples(mongo.getExamples());
        item.setDifficulty(mongo.getDifficulty());
        item.setTopics(mongo.getTopics());
        item.setSynonyms(mongo.getSynonyms());
        item.setAntonyms(mongo.getAntonyms());
        item.setRelatedWords(mongo.getRelatedWords());
        item.setCreatedBy(mongo.getCreatedBy());
        item.setCreatedAt(mongo.getCreatedAt());
        item.setUpdatedAt(mongo.getUpdatedAt());
        return item;
    }
}
