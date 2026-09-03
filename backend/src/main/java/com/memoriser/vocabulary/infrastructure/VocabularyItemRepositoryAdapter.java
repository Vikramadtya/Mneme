package com.memoriser.vocabulary.infrastructure;

import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

@Singleton
public class VocabularyItemRepositoryAdapter implements VocabularyItemRepository {

    private final MicronautDataMongoVocabularyRepository mongoRepository;

    public VocabularyItemRepositoryAdapter(MicronautDataMongoVocabularyRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }

    @Override
    public Publisher<VocabularyItem> save(VocabularyItem item) {
        return mongoRepository.save(toMongoModel(item)).map(this::toDomainModel);
    }
    
    @Override
    public Publisher<VocabularyItem> update(VocabularyItem item) {
        return mongoRepository.update(toMongoModel(item)).map(this::toDomainModel);
    }
    
    @Override
    public Publisher<Void> deleteById(String id) {
        return Mono.from(mongoRepository.deleteById(id)).then();
    }

    @Override
    public Publisher<VocabularyItem> findById(String id) {
        return mongoRepository.findById(id).map(this::toDomainModel);
    }
    
    @Override
    public Publisher<VocabularyItem> findByCreatedBy(String createdBy) {
        return mongoRepository.findByCreatedBy(createdBy).map(this::toDomainModel);
    }

    private MongoVocabularyItem toMongoModel(VocabularyItem item) {
        MongoVocabularyItem mongo = new MongoVocabularyItem();
        mongo.setId(item.getId());
        mongo.setWord(item.getWord());
        mongo.setDefinitions(item.getDefinitions());
        mongo.setExamples(item.getExamples());
        mongo.setPronunciation(item.getPronunciation());
        mongo.setDifficulty(item.getDifficulty());
        mongo.setTopics(item.getTopics());
        mongo.setSynonyms(item.getSynonyms());
        mongo.setAntonyms(item.getAntonyms());
        mongo.setRelatedWords(item.getRelatedWords());
        mongo.setCreatedBy(item.getCreatedBy());
        return mongo;
    }

    private VocabularyItem toDomainModel(MongoVocabularyItem mongo) {
        VocabularyItem item = new VocabularyItem();
        item.setId(mongo.getId());
        item.setWord(mongo.getWord());
        item.setDefinitions(mongo.getDefinitions());
        item.setExamples(mongo.getExamples());
        item.setPronunciation(mongo.getPronunciation());
        item.setDifficulty(mongo.getDifficulty());
        item.setTopics(mongo.getTopics());
        item.setSynonyms(mongo.getSynonyms());
        item.setAntonyms(mongo.getAntonyms());
        item.setRelatedWords(mongo.getRelatedWords());
        item.setCreatedBy(mongo.getCreatedBy());
        return item;
    }
}
