package com.memoriser.learning.presentation;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import com.memoriser.learning.domain.ReviewLog;
import com.memoriser.learning.domain.ReviewLogRepository;
import com.memoriser.learning.application.SpacedRepetitionService;
import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import com.memoriser.vocabulary.infrastructure.MicronautDataMongoCollectionRepository;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Instant;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.List;
import io.micronaut.core.annotation.Nullable;

@Controller("/api/v1/learning")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class LearningController {

    private final UserWordProgressRepository progressRepo;
    private final VocabularyItemRepository vocabularyRepo;
    private final SpacedRepetitionService srsService;
    private final MicronautDataMongoCollectionRepository collectionRepo;
    private final ReviewLogRepository reviewLogRepo;

    @Inject
    public LearningController(UserWordProgressRepository progressRepo, 
                              VocabularyItemRepository vocabularyRepo, 
                              SpacedRepetitionService srsService,
                              MicronautDataMongoCollectionRepository collectionRepo,
                              ReviewLogRepository reviewLogRepo) {
        this.progressRepo = progressRepo;
        this.vocabularyRepo = vocabularyRepo;
        this.srsService = srsService;
        this.collectionRepo = collectionRepo;
        this.reviewLogRepo = reviewLogRepo;
    }

    @Get("/today")
    public Publisher<Map<String, Object>> getDueReviews(Principal principal, @Nullable @QueryValue String collectionId) {
        String userId = principal.getName();
        
        Flux<UserWordProgress> baseProgress = Flux.from(progressRepo.findDueReviews(userId, Instant.now())).distinct(UserWordProgress::getWordId);
        Flux<UserWordProgress> filteredProgress;

        if (collectionId != null && !collectionId.isEmpty()) {
            filteredProgress = Mono.from(collectionRepo.findById(collectionId))
                    .flatMapMany(collection -> {
                        if (collection == null || collection.getWordIds() == null) return Flux.empty();
                        List<String> allowedWordIds = collection.getWordIds();
                        return baseProgress.filter(p -> allowedWordIds.contains(p.getWordId()));
                    });
        } else {
            filteredProgress = baseProgress;
        }

        return filteredProgress.flatMap(progress -> Mono.from(vocabularyRepo.findById(progress.getWordId()))
                        .map(vocab -> {
                            Map<String, Object> map = new HashMap<>();
                            map.put("progress", progress);
                            map.put("vocabulary", vocab);
                            return map;
                        }));
    }

    @Get("/stats")
    public Publisher<Map<String, Object>> getStats(Principal principal) {
        String userId = principal.getName();
        return Flux.from(vocabularyRepo.findByCreatedByAndCreatedAtGreaterThanEquals(userId, Instant.EPOCH))
                .map(VocabularyItem::getId)
                .collectList()
                .flatMap(validWordIds -> {
                    return Flux.from(progressRepo.findDueReviews(userId, Instant.now().plusSeconds(315360000)))
                        .collectList()
                        .map(list -> {
                            // Filter out orphans
                            list = list.stream().filter(p -> validWordIds.contains(p.getWordId())).collect(Collectors.toList());
                    java.util.List<UserWordProgress> uniqueList = new java.util.ArrayList<>();
                    java.util.Set<String> seen = new java.util.HashSet<>();
                    for (UserWordProgress p : list) {
                        if (seen.add(p.getWordId())) uniqueList.add(p);
                    }
                    
                    // HEALING LOGIC: Create progress for missing words
                    List<String> missingWordIds = validWordIds.stream()
                        .filter(id -> !seen.contains(id))
                        .collect(Collectors.toList());
                    
                    if (!missingWordIds.isEmpty()) {
                        System.out.println("Healing " + missingWordIds.size() + " missing progress entries...");
                        for (String missingId : missingWordIds) {
                            UserWordProgress p = new UserWordProgress();
                            p.setUserId(userId);
                            p.setWordId(missingId);
                            p.setState("NEW");
                            p.setDifficulty(5.0);
                            p.setStability(0.0);
                            p.setNextReviewAt(Instant.now());
                            p.setCreatedAt(Instant.now());
                            p.setReviewCount(0);
                            p.setSuccessCount(0);
                            p.setFailureCount(0);
                            // Fire and forget save to DB
                            Mono.from(progressRepo.save(p)).subscribe();
                            uniqueList.add(p);
                        }
                    }
                    long dueCount = uniqueList.stream().filter(p -> p.getNextReviewAt().isBefore(Instant.now())).count();
                    long newCount = uniqueList.stream().filter(p -> "NEW".equals(p.getState())).count();
                    long learningCount = uniqueList.stream().filter(p -> "LEARNING".equals(p.getState())).count();
                    long graduatedCount = uniqueList.stream().filter(p -> "GRADUATED".equals(p.getState())).count();
                    
                    Map<String, Object> stats = new HashMap<>();
                    stats.put("totalWords", uniqueList.size());
                    stats.put("dueCount", dueCount);
                    stats.put("newCount", newCount);
                    stats.put("learningCount", learningCount);
                    stats.put("graduatedCount", graduatedCount);
                    
                    long totalReviews = uniqueList.stream().mapToInt(UserWordProgress::getReviewCount).sum();
                    long successReviews = uniqueList.stream().mapToInt(UserWordProgress::getSuccessCount).sum();
                    double accuracy = totalReviews > 0 ? (double) successReviews / totalReviews * 100 : 0.0;
                    stats.put("accuracyPercent", Math.round(accuracy));
                    
                    return stats;
                });
                });
    }

    @Post("/{wordId}/review")
    public Publisher<UserWordProgress> submitReview(@PathVariable String wordId, 
                                                    @Body Map<String, Integer> payload, 
                                                    Principal principal) {
        String userId = principal.getName();
        int grade = payload.get("grade");

        return Mono.from(progressRepo.findByUserIdAndWordId(userId, wordId))
                .flatMap(progress -> {
                    UserWordProgress updated = srsService.processReview(progress, grade);
                    return Mono.from(progressRepo.save(updated));
                })
                .flatMap(savedProgress -> {
                    // Create and save review log
                    ReviewLog log = new ReviewLog();
                    log.setUserId(userId);
                    log.setWordId(wordId);
                    log.setGrade(grade);
                    log.setReviewedAt(Instant.now());
                    
                    return Mono.from(reviewLogRepo.save(log))
                               .thenReturn(savedProgress);
                });
    }
}
