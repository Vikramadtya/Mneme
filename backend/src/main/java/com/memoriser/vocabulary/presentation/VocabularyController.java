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
import reactor.core.publisher.Flux;
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
    public Publisher<VocabularyItem> addVocabularyItem(@Body VocabularyItem item, @QueryValue(defaultValue = "") String collectionId, Principal principal) {
        long start = System.currentTimeMillis();
        System.out.println("-> Starting addVocabularyItem for word: " + item.getWord());
        String userId = principal.getName();
        item.setCreatedBy(userId);
        item.setCreatedAt(Instant.now());

        return dictionaryService.fetchWordDetails(item).flatMap(enrichedItem -> {
            if (enrichedItem.getDefinitions() == null || enrichedItem.getDefinitions().isEmpty()) {
                enrichedItem.setDefinitions(List.of("No definition available."));
            }

            return Mono.from(vocabularyRepo.save(enrichedItem)).flatMap(savedItem -> {
                // Setup default progress
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
                    // Find target collection
                    Mono<MongoVocabularyCollection> targetCollectionMono;
                    if (collectionId != null && !collectionId.isEmpty()) {
                        targetCollectionMono = Mono.from(collectionRepo.findById(collectionId));
                    } else {
                        targetCollectionMono = Mono.from(collectionRepo.findByUserId(userId).filter(c -> "Inbox".equalsIgnoreCase(c.getName())).next());
                    }

                    return targetCollectionMono
                        .switchIfEmpty(Mono.defer(() -> {
                            MongoVocabularyCollection inbox = new MongoVocabularyCollection();
                            inbox.setUserId(userId);
                            inbox.setName("Inbox");
                            inbox.setDescription("Default collection for new words");
                            inbox.setWordIds(new ArrayList<>());
                            inbox.setCreatedAt(Instant.now());
                            return Mono.from(collectionRepo.save(inbox));
                        }))
                        .flatMap(targetCol -> {
                            if (targetCol.getWordIds() == null) {
                                targetCol.setWordIds(new ArrayList<>());
                            }
                            if (!targetCol.getWordIds().contains(savedItem.getId())) {
                                targetCol.getWordIds().add(savedItem.getId());
                            }
                            return Mono.from(collectionRepo.update(targetCol));
                        })
                        .thenReturn(savedItem);
                });
            });
        });
    }

    @Put("/{id}")
    public Publisher<VocabularyItem> updateVocabularyItem(@PathVariable String id, @Body VocabularyItem item, @QueryValue(defaultValue = "") String collectionId, Principal principal) {
        String userId = principal.getName();
        
        return Mono.from(vocabularyRepo.findById(id))
            .switchIfEmpty(Mono.error(new RuntimeException("Word not found")))
            .flatMap(existingItem -> {
                if (!existingItem.getCreatedBy().equals(userId)) {
                    return Mono.error(new RuntimeException("Unauthorized"));
                }
                
                // Merge updates
                existingItem.setWord(item.getWord());
                if (item.getDefinitions() != null) existingItem.setDefinitions(item.getDefinitions());
                if (item.getExamples() != null) existingItem.setExamples(item.getExamples());
                if (item.getPronunciation() != null) existingItem.setPronunciation(item.getPronunciation());
                
                return Mono.from(vocabularyRepo.update(existingItem)).flatMap(savedItem -> {
                    if (collectionId != null && !collectionId.isEmpty()) {
                        // 1. Remove word from all collections
                        return Flux.from(collectionRepo.findByUserId(userId))
                            .flatMap(col -> {
                                if (col.getWordIds() != null && col.getWordIds().contains(id)) {
                                    col.getWordIds().remove(id);
                                    return Mono.from(collectionRepo.update(col));
                                }
                                return Mono.just(col);
                            })
                            .then(Mono.defer(() -> {
                                // 2. Add word to the target collection
                                return Mono.from(collectionRepo.findById(collectionId)).flatMap(targetCol -> {
                                    if (targetCol.getWordIds() == null) {
                                        targetCol.setWordIds(new ArrayList<>());
                                    }
                                    if (!targetCol.getWordIds().contains(id)) {
                                        targetCol.getWordIds().add(id);
                                    }
                                    return Mono.from(collectionRepo.update(targetCol));
                                });
                            }))
                            .thenReturn(savedItem);
                    }
                    return Mono.just(savedItem);
                });
            });
    }



    @Delete("/{id}")
    public Publisher<Void> deleteVocabularyItem(@PathVariable String id, Principal principal) {
        String userId = principal.getName();
        // Remove word from all collections before deleting
        return Flux.from(collectionRepo.findByUserId(userId))
            .flatMap(col -> {
                if (col.getWordIds() != null && col.getWordIds().contains(id)) {
                    col.getWordIds().remove(id);
                    return Mono.from(collectionRepo.update(col));
                }
                return Mono.just(col);
            })
            .then(Mono.from(vocabularyRepo.deleteById(id)));
    }
}
