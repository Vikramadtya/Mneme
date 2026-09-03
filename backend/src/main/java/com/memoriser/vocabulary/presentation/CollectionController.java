package com.memoriser.vocabulary.presentation;

import com.memoriser.vocabulary.domain.VocabularyCollection;
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
import java.util.Map;

@Controller("/api/v1/collections")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class CollectionController {

    private final MicronautDataMongoCollectionRepository collectionRepo;

    @Inject
    public CollectionController(MicronautDataMongoCollectionRepository collectionRepo) {
        this.collectionRepo = collectionRepo;
    }

    @Get
    public Publisher<VocabularyCollection> getCollections(Principal principal) {
        return collectionRepo.findByUserId(principal.getName()).map(this::toDomain);
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
