package com.memoriser.vocabulary.presentation;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
import com.memoriser.vocabulary.application.DictionaryService;
import com.memoriser.vocabulary.infrastructure.MicronautDataMongoCollectionRepository;
import com.memoriser.vocabulary.infrastructure.MongoVocabularyCollection;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

import java.security.Principal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Controller("/api/v1/vocabulary")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class VocabularyController {

    private final VocabularyItemRepository vocabularyRepo;
    private final UserWordProgressRepository progressRepo;
    private final DictionaryService dictionaryService;
    private final MicronautDataMongoCollectionRepository collectionRepo;

    @Inject
    public VocabularyController(VocabularyItemRepository vocabularyRepo, UserWordProgressRepository progressRepo, DictionaryService dictionaryService, MicronautDataMongoCollectionRepository collectionRepo) {
        this.vocabularyRepo = vocabularyRepo;
        this.progressRepo = progressRepo;
        this.dictionaryService = dictionaryService;
        this.collectionRepo = collectionRepo;
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

        return dictionaryService.fetchWordDetails(item).flatMap(enrichedItem -> {
            
            if (enrichedItem.getDefinitions() == null || enrichedItem.getDefinitions().isEmpty()) {
                enrichedItem.setDefinitions(List.of("No definition available."));
            }

            return Mono.from(vocabularyRepo.save(enrichedItem)).flatMap(savedItem -> {
                // 1. Setup default progress
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
                
                return Mono.from(progressRepo.save(p)).flatMap(progress -> {
                    // 2. Automatically assign to "Inbox" collection
                    return Mono.from(collectionRepo.findByUserId(userId).filter(c -> "Inbox".equalsIgnoreCase(c.getName())).next())
                        .switchIfEmpty(Mono.defer(() -> {
                            MongoVocabularyCollection inbox = new MongoVocabularyCollection();
                            inbox.setUserId(userId);
                            inbox.setName("Inbox");
                            inbox.setDescription("Default collection for new words");
                            inbox.setWordIds(new ArrayList<>());
                            inbox.setCreatedAt(Instant.now());
                            return Mono.from(collectionRepo.save(inbox));
                        }))
                        .flatMap(inbox -> {
                            if (inbox.getWordIds() == null) {
                                inbox.setWordIds(new ArrayList<>());
                            }
                            if (!inbox.getWordIds().contains(savedItem.getId())) {
                                inbox.getWordIds().add(savedItem.getId());
                            }
                            return Mono.from(collectionRepo.update(inbox));
                        })
                        .thenReturn(savedItem);
                });
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
        // Optionally, remove the wordId from collections? Usually cascade deletes happen async or via cleanup, 
        // but for now we'll just delete the item.
        return vocabularyRepo.deleteById(id);
    }
}
