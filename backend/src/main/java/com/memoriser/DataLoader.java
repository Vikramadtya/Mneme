package com.memoriser;

import com.memoriser.learning.infrastructure.MicronautDataMongoUserWordProgressRepository;
import com.memoriser.learning.infrastructure.MongoUserWordProgress;
import com.memoriser.vocabulary.infrastructure.MicronautDataMongoVocabularyRepository;
import com.memoriser.vocabulary.infrastructure.MongoVocabularyItem;
import io.micronaut.context.event.StartupEvent;
import io.micronaut.runtime.event.annotation.EventListener;
import jakarta.inject.Singleton;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

@Singleton
public class DataLoader {

    private final MicronautDataMongoVocabularyRepository vocabRepo;
    private final MicronautDataMongoUserWordProgressRepository progressRepo;

    public DataLoader(MicronautDataMongoVocabularyRepository vocabRepo, MicronautDataMongoUserWordProgressRepository progressRepo) {
        this.vocabRepo = vocabRepo;
        this.progressRepo = progressRepo;
    }

    @EventListener
    public void onStartup(StartupEvent event) {
        vocabRepo.count().flatMap(count -> {
            if (count == 0) {
                System.out.println("Seeding database with initial vocabulary...");
                
                MongoVocabularyItem word1 = new MongoVocabularyItem();
                word1.setWord("Ubiquitous");
                word1.setPronunciation("/yo͞oˈbikwədəs/");
                word1.setDefinitions(List.of("Present, appearing, or found everywhere."));
                word1.setExamples(List.of("His ubiquitous influence was felt by all the family."));
                word1.setCreatedBy("0000-0000-0000-0000");
                word1.setCreatedAt(Instant.now());

                MongoVocabularyItem word2 = new MongoVocabularyItem();
                word2.setWord("Ephemeral");
                word2.setPronunciation("/əˈfem(ə)rəl/");
                word2.setDefinitions(List.of("Lasting for a very short time."));
                word2.setExamples(List.of("Fashions are ephemeral."));
                word2.setCreatedBy("0000-0000-0000-0000");
                word2.setCreatedAt(Instant.now());

                MongoVocabularyItem word3 = new MongoVocabularyItem();
                word3.setWord("Sycophant");
                word3.setPronunciation("/ˈsikəˌfant/");
                word3.setDefinitions(List.of("A person who acts obsequiously toward someone important in order to gain advantage."));
                word3.setExamples(List.of("The Prime Minister is surrounded by sycophants."));
                word3.setCreatedBy("0000-0000-0000-0000");
                word3.setCreatedAt(Instant.now());

                return vocabRepo.saveAll(List.of(word1, word2, word3)).collectList().flatMap(savedWords -> {
                    System.out.println("Seeding user progress for user 0000-0000-0000-0000...");
                    
                    MongoUserWordProgress p1 = new MongoUserWordProgress();
                    p1.setUserId("0000-0000-0000-0000");
                    p1.setWordId(savedWords.get(0).getId());
                    p1.setState("LEARNING");
                    p1.setDifficulty(5.0);
                    p1.setStability(1.0);
                    p1.setNextReviewAt(Instant.now().minusSeconds(3600)); // Due 1 hour ago
                    p1.setCreatedAt(Instant.now());
                    p1.setReviewCount(0);
                    p1.setSuccessCount(0);
                    p1.setFailureCount(0);

                    MongoUserWordProgress p2 = new MongoUserWordProgress();
                    p2.setUserId("0000-0000-0000-0000");
                    p2.setWordId(savedWords.get(1).getId());
                    p2.setState("LEARNING");
                    p2.setDifficulty(5.0);
                    p2.setStability(1.0);
                    p2.setNextReviewAt(Instant.now().minusSeconds(86400)); // Due 1 day ago
                    p2.setCreatedAt(Instant.now());
                    p2.setReviewCount(0);
                    p2.setSuccessCount(0);
                    p2.setFailureCount(0);

                    return progressRepo.saveAll(List.of(p1, p2)).collectList();
                });
            }
            return Mono.empty();
        }).subscribe();
    }
}
