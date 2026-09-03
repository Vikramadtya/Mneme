package com.memoriser.vocabulary.presentation;

import com.memoriser.vocabulary.domain.VocabularyCollection;
import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.VocabularyItemRepository;
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
import java.util.Map;

@Controller("/api/v1/collections")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class CollectionController {

    private final MicronautDataMongoCollectionRepository collectionRepo;
    private final VocabularyItemRepository vocabularyRepo;

    @Inject
    public CollectionController(MicronautDataMongoCollectionRepository collectionRepo, VocabularyItemRepository vocabularyRepo) {
        this.collectionRepo = collectionRepo;
        this.vocabularyRepo = vocabularyRepo;
    }

    @Get
    public Publisher<VocabularyCollection> getCollections(Principal principal) {
        String userId = principal.getName();
        
        return Flux.from(collectionRepo.findByUserId(userId))
            .collectList()
            .flatMapMany(collections -> {
                if (collections.isEmpty()) {
                    // Auto-create Inbox and assign all existing words to it
                    return Flux.from(vocabularyRepo.findByCreatedBy(userId))
                        .map(VocabularyItem::getId)
                        .collectList()
                        .flatMap(wordIds -> {
                            MongoVocabularyCollection inbox = new MongoVocabularyCollection();
                            inbox.setUserId(userId);
                            inbox.setName("Inbox");
                            inbox.setDescription("Default collection for your words");
                            inbox.setWordIds(wordIds != null ? wordIds : new ArrayList<>());
                            inbox.setCreatedAt(Instant.now());
                            return Mono.from(collectionRepo.save(inbox));
                        })
                        .map(this::toDomain)
                        .flux();
                } else {
                    // Verify Inbox exists among collections, if not, create it but don't auto-assign everything
                    boolean hasInbox = collections.stream().anyMatch(c -> "Inbox".equalsIgnoreCase(c.getName()));
                    if (!hasInbox) {
                        MongoVocabularyCollection inbox = new MongoVocabularyCollection();
                        inbox.setUserId(userId);
                        inbox.setName("Inbox");
                        inbox.setDescription("Default collection for your words");
                        inbox.setWordIds(new ArrayList<>());
                        inbox.setCreatedAt(Instant.now());
                        
                        return Mono.from(collectionRepo.save(inbox))
                                .flatMapMany(savedInbox -> {
                                    collections.add(savedInbox);
                                    return Flux.fromIterable(collections).map(this::toDomain);
                                });
                    }
                    
                    return Flux.fromIterable(collections).map(this::toDomain);
                }
            });
    }

    @Post
    public Publisher<VocabularyCollection> createCollection(@Body VocabularyCollection collection, Principal principal) {
        MongoVocabularyCollection mongo = new MongoVocabularyCollection();
        mongo.setName(collection.getName());
        mongo.setDescription(collection.getDescription());
        mongo.setUserId(principal.getName());
        mongo.setWordIds(new ArrayList<>());
        mongo.setCreatedAt(Instant.now());
        
        return collectionRepo.save(mongo).map(this::toDomain);
    }

    @Put("/{id}/words")
    public Publisher<VocabularyCollection> updateCollectionWords(@PathVariable String id, @Body Map<String, List<String>> payload, Principal principal) {
        return Mono.from(collectionRepo.findById(id)).flatMap(mongo -> {
            if (!mongo.getUserId().equals(principal.getName())) {
                return Mono.error(new RuntimeException("Unauthorized"));
            }
            mongo.setWordIds(payload.get("wordIds"));
            return Mono.from(collectionRepo.update(mongo)).map(this::toDomain);
        });
    }

    @Delete("/{id}")
    public Publisher<Void> deleteCollection(@PathVariable String id, Principal principal) {
        return Mono.from(collectionRepo.findById(id)).flatMap(mongo -> {
            if (!mongo.getUserId().equals(principal.getName())) {
                return Mono.error(new RuntimeException("Unauthorized"));
            }
            if ("Inbox".equalsIgnoreCase(mongo.getName())) {
                return Mono.error(new RuntimeException("Cannot delete Inbox collection"));
            }
            return Mono.from(collectionRepo.deleteById(id)).map(count -> null); // Map Long to Void
        });
    }

    private VocabularyCollection toDomain(MongoVocabularyCollection mongo) {
        VocabularyCollection c = new VocabularyCollection();
        c.setId(mongo.getId());
        c.setName(mongo.getName());
        c.setDescription(mongo.getDescription());
        c.setUserId(mongo.getUserId());
        c.setWordIds(mongo.getWordIds());
        c.setCreatedAt(mongo.getCreatedAt());
        return c;
    }
}
