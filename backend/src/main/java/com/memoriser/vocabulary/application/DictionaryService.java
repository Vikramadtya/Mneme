package com.memoriser.vocabulary.application;

import com.memoriser.vocabulary.domain.VocabularyItem;
import com.memoriser.vocabulary.domain.Meaning;
import io.micronaut.json.JsonMapper;
import jakarta.inject.Singleton;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Singleton
public class DictionaryService {

    private final JsonMapper jsonMapper;
    private final HttpClient httpClient;

    public DictionaryService(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Mono<VocabularyItem> fetchWordDetails(VocabularyItem item) {
        long start = System.currentTimeMillis();
        // Skip fetching if the user already provided definitions (e.g., via auto-fill or manually)
        if (item.getDefinitions() != null && !item.getDefinitions().isEmpty()) {
            return Mono.just(item);
        }
        
        String cleanWord = item.getWord().trim().toLowerCase();
        
        return fetchFromFallback(item, cleanWord);

        return Mono.fromFuture(future).doOnSuccess(res -> System.out.println("-> DictionaryService finished in " + (System.currentTimeMillis() - start) + "ms"));
    }

    private CompletableFuture<VocabularyItem> fetchFromFallback(VocabularyItem item, String cleanWord) {
        HttpRequest requestFallback = HttpRequest.newBuilder()
                .uri(URI.create("https://api.datamuse.com/words?sp=" + cleanWord + "&md=dp&max=1"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        return httpClient.sendAsync(requestFallback, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() != 200) return item;
                    
                    try {
                        List<Map> responseList = jsonMapper.readValue(response.body().getBytes(), io.micronaut.core.type.Argument.of(List.class, Map.class));
                        if (responseList == null || responseList.isEmpty()) return item;
                        
                        Map<String, Object> entry = (Map<String, Object>) responseList.get(0);
                        
                        Meaning meaning = new Meaning();
                        meaning.setDefinitions(new ArrayList<>());
                        
                        if (entry.containsKey("defs")) {
                            List<String> defs = (List<String>) entry.get("defs");
                            if (defs != null && !defs.isEmpty()) {
                                String rawDef = defs.get(0);
                                int tabIndex = rawDef.indexOf('\t');
                                String defText = tabIndex != -1 ? rawDef.substring(tabIndex + 1).trim() : rawDef.trim();
                                
                                Meaning.Definition d = new Meaning.Definition();
                                d.setDefinition(defText);
                                meaning.getDefinitions().add(d);
                                
                                if (item.getDefinitions() == null || item.getDefinitions().isEmpty()) {
                                    item.setDefinitions(List.of(defText));
                                }
                                
                                if (tabIndex != -1) {
                                    String pos = rawDef.substring(0, tabIndex).trim();
                                    if (pos.equals("n")) meaning.setPartOfSpeech("noun");
                                    else if (pos.equals("v")) meaning.setPartOfSpeech("verb");
                                    else if (pos.equals("adj")) meaning.setPartOfSpeech("adjective");
                                    else meaning.setPartOfSpeech(pos);
                                }
                            }
                        }

                        if (entry.containsKey("tags")) {
                            List<String> tags = (List<String>) entry.get("tags");
                            if (tags != null) {
                                for (String tag : tags) {
                                    if (tag.startsWith("pron:")) {
                                        String p = "/" + tag.substring(5).trim().toLowerCase() + "/";
                                        if (item.getPronunciation() == null || item.getPronunciation().isEmpty()) {
                                            item.setPronunciation(p);
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (!meaning.getDefinitions().isEmpty()) {
                            item.setMeanings(List.of(meaning));
                        }

                    } catch (Exception e) {
                        // Ignore
                    }
                    return item;
                })
                .exceptionally(ex -> item);
    }
}
