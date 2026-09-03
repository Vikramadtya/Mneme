package com.memoriser.vocabulary.presentation;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import com.memoriser.vocabulary.application.DictionaryService;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Instant;
import java.util.List;

@Controller("/api/v1/vocabulary")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class VocabularyController {

    private final VocabularyItemRepository vocabularyRepo;
    private final UserWordProgressRepository progressRepo;
    private final DictionaryService dictionaryService;

    @Inject
    public VocabularyController(VocabularyItemRepository vocabularyRepo, UserWordProgressRepository progressRepo, DictionaryService dictionaryService) {
        this.vocabularyRepo = vocabularyRepo;
        this.progressRepo = progressRepo;
        this.dictionaryService = dictionaryService;
    }

    @Get("/me")
    public Publisher<VocabularyItem> getMyVocabulary(Principal principal) {
        return vocabularyRepo.findByCreatedBy(principal.getName());
    }

    @Get("/{id}")
    public Publisher<VocabularyItem> getVocabularyItem(@PathVariable String id, Principal principal) {
        return vocabularyRepo.findById(id);
    }

    @Post
    public Publisher<VocabularyItem> addVocabularyItem(@Body VocabularyItem item, Principal principal) {
        String userId = principal.getName();
        item.setCreatedBy(userId);
        item.setCreatedAt(Instant.now());

        // We completely replace the old manual mapping logic and let DictionaryService do it!
        return dictionaryService.fetchWordDetails(item).flatMap(enrichedItem -> {
            
            // Ensure there is at least a fallback if the API is down
            if (enrichedItem.getDefinitions() == null || enrichedItem.getDefinitions().isEmpty()) {
                enrichedItem.setDefinitions(List.of("No definition available."));
            }

            return Mono.from(vocabularyRepo.save(enrichedItem)).flatMap(savedItem -> {
                UserWordProgress p = new UserWordProgress();
                p.setUserId(userId);
                p.setWordId(savedItem.getId());
                p.setState("NEW");
                p.setDifficulty(5.0);
                p.setStability(0.0);
                p.setNextReviewAt(Instant.now());
                p.setCreatedAt(Instant.now());
                p.setReviewCount(0);
                p.setSuccessCount(0);
                p.setFailureCount(0);
                return Mono.from(progressRepo.save(p)).thenReturn(savedItem);
            });
        });
    }

    @Put("/{id}")
    public Publisher<VocabularyItem> updateVocabularyItem(@PathVariable String id, @Body VocabularyItem item, Principal principal) {
        item.setId(id);
        item.setCreatedBy(principal.getName());
        return vocabularyRepo.save(item);
    }

    @Delete("/{id}")
    public Publisher<Void> deleteVocabularyItem(@PathVariable String id, Principal principal) {
        return vocabularyRepo.deleteById(id);
    }
}
