package com.memoriser.learning.infrastructure;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import java.time.Instant;

@Singleton
public class UserWordProgressRepositoryAdapter implements UserWordProgressRepository {

    private final MicronautDataMongoUserWordProgressRepository mongoRepository;

    public UserWordProgressRepositoryAdapter(MicronautDataMongoUserWordProgressRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }

    @Override
    public Publisher<UserWordProgress> save(UserWordProgress progress) {
        MongoUserWordProgress mongoModel = toMongoModel(progress);
        if (mongoModel.getId() != null && !mongoModel.getId().isEmpty()) {
            return mongoRepository.update(mongoModel).map(this::toDomainModel);
        }
        return mongoRepository.save(mongoModel).map(this::toDomainModel);
    }

    @Override
    public Publisher<UserWordProgress> findByUserIdAndWordId(String userId, String wordId) {
        return mongoRepository.findByUserIdAndWordId(userId, wordId).map(this::toDomainModel);
    }

    @Override
    public Publisher<UserWordProgress> findDueReviews(String userId, Instant before) {
        return mongoRepository.findByUserIdAndNextReviewAtLessThanEquals(userId, before).map(this::toDomainModel);
    }

    @Override
    public Publisher<UserWordProgress> findByUserId(String userId) {
        return mongoRepository.findByUserId(userId).map(this::toDomainModel);
    }

    @Override
    public Publisher<Void> deleteByUserIdAndWordId(String userId, String wordId) {
        return mongoRepository.deleteByUserIdAndWordId(userId, wordId).then();
    }

    private MongoUserWordProgress toMongoModel(UserWordProgress progress) {
        MongoUserWordProgress mongo = new MongoUserWordProgress();
        mongo.setId(progress.getId());
        mongo.setUserId(progress.getUserId());
        mongo.setWordId(progress.getWordId());
        mongo.setState(progress.getState());
        mongo.setDifficulty(progress.getDifficulty());
        mongo.setStability(progress.getStability());
        mongo.setLastReviewedAt(progress.getLastReviewedAt());
        mongo.setNextReviewAt(progress.getNextReviewAt());
        mongo.setReviewCount(progress.getReviewCount());
        mongo.setSuccessCount(progress.getSuccessCount());
        mongo.setFailureCount(progress.getFailureCount());
        return mongo;
    }

    private UserWordProgress toDomainModel(MongoUserWordProgress mongo) {
        UserWordProgress progress = new UserWordProgress();
        progress.setId(mongo.getId());
        progress.setUserId(mongo.getUserId());
        progress.setWordId(mongo.getWordId());
        progress.setState(mongo.getState());
        progress.setDifficulty(mongo.getDifficulty() != null ? mongo.getDifficulty() : 5.0);
        progress.setStability(mongo.getStability() != null ? mongo.getStability() : 0.0);
        progress.setLastReviewedAt(mongo.getLastReviewedAt());
        progress.setNextReviewAt(mongo.getNextReviewAt());
        progress.setReviewCount(mongo.getReviewCount() != null ? mongo.getReviewCount() : 0);
        progress.setSuccessCount(mongo.getSuccessCount() != null ? mongo.getSuccessCount() : 0);
        progress.setFailureCount(mongo.getFailureCount() != null ? mongo.getFailureCount() : 0);
        return progress;
    }
}
