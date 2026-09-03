package com.memoriser.learning.presentation;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
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

    @Inject
    public LearningController(UserWordProgressRepository progressRepo, 
                              VocabularyItemRepository vocabularyRepo, 
                              SpacedRepetitionService srsService,
                              MicronautDataMongoCollectionRepository collectionRepo) {
        this.progressRepo = progressRepo;
        this.vocabularyRepo = vocabularyRepo;
        this.srsService = srsService;
        this.collectionRepo = collectionRepo;
    }

    @Get("/today")
    public Publisher<Map<String, Object>> getDueReviews(Principal principal, @Nullable @QueryValue String collectionId) {
        String userId = principal.getName();
        
        Flux<UserWordProgress> baseProgress = Flux.from(progressRepo.findDueReviews(userId, Instant.now()));
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
        return Flux.from(progressRepo.findDueReviews(userId, Instant.now().plusSeconds(315360000))) 
                .collectList()
                .map(list -> {
                    long dueCount = list.stream().filter(p -> p.getNextReviewAt().isBefore(Instant.now())).count();
                    long newCount = list.stream().filter(p -> "NEW".equals(p.getState())).count();
                    long learningCount = list.stream().filter(p -> "LEARNING".equals(p.getState())).count();
                    long graduatedCount = list.stream().filter(p -> "GRADUATED".equals(p.getState())).count();
                    
                    Map<String, Object> stats = new HashMap<>();
                    stats.put("totalWords", list.size());
                    stats.put("dueCount", dueCount);
                    stats.put("newCount", newCount);
                    stats.put("learningCount", learningCount);
                    stats.put("graduatedCount", graduatedCount);
                    
                    long totalReviews = list.stream().mapToInt(UserWordProgress::getReviewCount).sum();
                    long successReviews = list.stream().mapToInt(UserWordProgress::getSuccessCount).sum();
                    double accuracy = totalReviews > 0 ? (double) successReviews / totalReviews * 100 : 0.0;
                    stats.put("accuracyPercent", Math.round(accuracy));
                    
                    return stats;
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
                });
    }
}
