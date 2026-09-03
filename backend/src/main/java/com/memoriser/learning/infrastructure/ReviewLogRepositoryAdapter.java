package com.memoriser.learning.infrastructure;

import com.memoriser.learning.domain.ReviewLog;
import com.memoriser.learning.domain.ReviewLogRepository;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;

import java.time.Instant;

@Singleton
public class ReviewLogRepositoryAdapter implements ReviewLogRepository {

    private final MicronautDataMongoReviewLogRepository mongoRepository;

    public ReviewLogRepositoryAdapter(MicronautDataMongoReviewLogRepository mongoRepository) {
        this.mongoRepository = mongoRepository;
    }

    @Override
    public Publisher<ReviewLog> save(ReviewLog log) {
        MongoReviewLog mongo = new MongoReviewLog();
        mongo.setId(log.getId());
        mongo.setUserId(log.getUserId());
        mongo.setWordId(log.getWordId());
        mongo.setGrade(log.getGrade());
        mongo.setReviewedAt(log.getReviewedAt());
        return mongoRepository.save(mongo).map(this::toDomain);
    }

    @Override
    public Publisher<ReviewLog> findByUserIdAndReviewedAtBetween(String userId, Instant start, Instant end) {
        return mongoRepository.findByUserIdAndReviewedAtBetween(userId, start, end).map(this::toDomain);
    }

    private ReviewLog toDomain(MongoReviewLog mongo) {
        ReviewLog domain = new ReviewLog();
        domain.setId(mongo.getId());
        domain.setUserId(mongo.getUserId());
        domain.setWordId(mongo.getWordId());
        domain.setGrade(mongo.getGrade() != null ? mongo.getGrade() : 0);
        domain.setReviewedAt(mongo.getReviewedAt());
        return domain;
    }
}
