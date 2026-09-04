package com.memoriser.learning.presentation;

import com.memoriser.learning.domain.ReviewLog;
import com.memoriser.learning.domain.ReviewLogRepository;
import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import com.memoriser.vocabulary.infrastructure.MicronautDataMongoCollectionRepository;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Controller("/api/v1/analytics")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class AnalyticsController {

    private final ReviewLogRepository reviewLogRepo;
    private final VocabularyItemRepository vocabularyRepo;
    private final UserWordProgressRepository progressRepo;
    private final MicronautDataMongoCollectionRepository collectionRepo;

    @Inject
    public AnalyticsController(ReviewLogRepository reviewLogRepo,
                               VocabularyItemRepository vocabularyRepo,
                               UserWordProgressRepository progressRepo,
                               MicronautDataMongoCollectionRepository collectionRepo) {
        this.reviewLogRepo = reviewLogRepo;
        this.vocabularyRepo = vocabularyRepo;
        this.progressRepo = progressRepo;
        this.collectionRepo = collectionRepo;
    }

    @Get("/activity")
    public Publisher<Map<String, Object>> getActivity(Principal principal) {
        String userId = principal.getName();
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());

        Mono<Map<String, Long>> reviewsMono = Flux.from(reviewLogRepo.findByUserIdAndReviewedAtBetween(userId, thirtyDaysAgo, Instant.now()))
                .collectList()
                .map(logs -> logs.stream()
                        .collect(Collectors.groupingBy(
                                log -> formatter.format(log.getReviewedAt()),
                                Collectors.counting()
                        )));

        Mono<Map<String, Long>> wordsAddedMono = Flux.from(vocabularyRepo.findByCreatedByAndCreatedAtGreaterThanEquals(userId, thirtyDaysAgo))
                .collectList()
                .map(words -> words.stream()
                        .collect(Collectors.groupingBy(
                                w -> formatter.format(w.getCreatedAt()),
                                Collectors.counting()
                        )));

        return Mono.zip(reviewsMono, wordsAddedMono).map(tuple -> {
            Map<String, Long> reviewsPerDay = tuple.getT1();
            Map<String, Long> wordsAddedPerDay = tuple.getT2();

            // Fill empty days for the last 30 days
            List<Map<String, Object>> activityList = new ArrayList<>();
            for (int i = 29; i >= 0; i--) {
                Instant day = Instant.now().minus(i, ChronoUnit.DAYS);
                String dateStr = formatter.format(day);
                
                Map<String, Object> dayData = new HashMap<>();
                dayData.put("date", dateStr);
                dayData.put("reviews", reviewsPerDay.getOrDefault(dateStr, 0L));
                dayData.put("newWords", wordsAddedPerDay.getOrDefault(dateStr, 0L));
                activityList.add(dayData);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("activity", activityList);
            return result;
        });
    }

    @Get("/confidence")
    public Publisher<Map<String, Object>> getConfidence(Principal principal) {
        String userId = principal.getName();
        return Flux.from(progressRepo.findByUserId(userId))
                .collectList()
                .map(progressList -> {
                    long high = 0;
                    long medium = 0;
                    long low = 0;

                    for (UserWordProgress p : progressList) {
                        if ("NEW".equals(p.getState())) {
                            low++;
                        } else if ("GRADUATED".equals(p.getState()) || p.getStability() > 10.0) {
                            high++;
                        } else if (p.getDifficulty() > 7.0) {
                            low++;
                        } else {
                            medium++;
                        }
                    }

                    Map<String, Object> result = new HashMap<>();
                    result.put("high", high);
                    result.put("medium", medium);
                    result.put("low", low);
                    return result;
                });
    }

    @Get("/collections")
    public Publisher<List<Map<String, Object>>> getCollectionsAnalytics(Principal principal) {
        String userId = principal.getName();
        
        Mono<List<UserWordProgress>> allProgressMono = Flux.from(progressRepo.findByUserId(userId)).collectList();
        
        return allProgressMono.flatMapMany(progressList -> {
            Map<String, UserWordProgress> progressMap = progressList.stream()
                    .collect(Collectors.toMap(UserWordProgress::getWordId, p -> p));

            return Flux.from(collectionRepo.findByUserId(userId))
                    .map(collection -> {
                        Map<String, Object> stats = new HashMap<>();
                        stats.put("name", collection.getName());
                        stats.put("id", collection.getId());
                        
                        List<String> wordIds = collection.getWordIds() != null ? collection.getWordIds() : Collections.emptyList();
                        stats.put("wordCount", wordIds.size());
                        
                        long totalReviews = 0;
                        long successReviews = 0;
                        
                        for (String wordId : wordIds) {
                            UserWordProgress p = progressMap.get(wordId);
                            if (p != null) {
                                totalReviews += p.getReviewCount();
                                successReviews += p.getSuccessCount();
                            }
                        }
                        
                        double accuracy = totalReviews > 0 ? (double) successReviews / totalReviews * 100 : 0.0;
                        stats.put("accuracyPercent", Math.round(accuracy));
                        
                        return stats;
                    });
        }).collectList();
    }
}
