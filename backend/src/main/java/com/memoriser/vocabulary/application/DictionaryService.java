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
        String cleanWord = item.getWord().trim().toLowerCase();
        
        HttpRequest requestPrimary = HttpRequest.newBuilder()
                .uri(URI.create("https://api.dictionaryapi.dev/api/v2/entries/en/" + cleanWord))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        CompletableFuture<VocabularyItem> future = httpClient.sendAsync(requestPrimary, HttpResponse.BodyHandlers.ofString())
                .thenCompose(response -> {
                    if (response.statusCode() == 200) {
                        try {
                            List<Map> responseList = jsonMapper.readValue(response.body().getBytes(), io.micronaut.core.type.Argument.of(List.class, Map.class));
                            Map<String, Object> entry = (Map<String, Object>) responseList.get(0);
                            
                            // Extract Origin
                            if (entry.containsKey("origin")) {
                                item.setOrigin((String) entry.get("origin"));
                            }
                            
                            // Extract Phonetics and Audio
                            if (entry.containsKey("phonetics")) {
                                List<Map<String, Object>> phonetics = (List<Map<String, Object>>) entry.get("phonetics");
                                for (Map<String, Object> phonetic : phonetics) {
                                    if (phonetic.containsKey("text") && (item.getPronunciation() == null || item.getPronunciation().isEmpty())) {
                                        item.setPronunciation((String) phonetic.get("text"));
                                    }
                                    if (phonetic.containsKey("audio")) {
                                        String audio = (String) phonetic.get("audio");
                                        if (audio != null && !audio.isEmpty()) {
                                            item.setAudioUrl(audio);
                                            break; // Found an audio file
                                        }
                                    }
                                }
                            }
                            if (item.getPronunciation() == null && entry.containsKey("phonetic")) {
                                item.setPronunciation((String) entry.get("phonetic"));
                            }
                            
                            // Extract Meanings
                            List<Meaning> domainMeanings = new ArrayList<>();
                            if (entry.containsKey("meanings")) {
                                List<Map<String, Object>> meanings = (List<Map<String, Object>>) entry.get("meanings");
                                for (Map<String, Object> meaningMap : meanings) {
                                    Meaning m = new Meaning();
                                    m.setPartOfSpeech((String) meaningMap.get("partOfSpeech"));
                                    
                                    // Synonyms at meaning level
                                    if (meaningMap.containsKey("synonyms")) {
                                        m.setSynonyms((List<String>) meaningMap.get("synonyms"));
                                    }
                                    
                                    // Definitions
                                    List<Meaning.Definition> domainDefs = new ArrayList<>();
                                    if (meaningMap.containsKey("definitions")) {
                                        List<Map<String, Object>> defs = (List<Map<String, Object>>) meaningMap.get("definitions");
                                        for (Map<String, Object> dMap : defs) {
                                            Meaning.Definition d = new Meaning.Definition();
                                            d.setDefinition((String) dMap.get("definition"));
                                            d.setExample((String) dMap.get("example"));
                                            domainDefs.add(d);
                                            
                                            // Fallback to flat fields
                                            if (item.getDefinitions() == null || item.getDefinitions().isEmpty()) {
                                                item.setDefinitions(List.of(d.getDefinition()));
                                            }
                                            if (d.getExample() != null && (item.getExamples() == null || item.getExamples().isEmpty())) {
                                                item.setExamples(List.of(d.getExample()));
                                            }
                                        }
                                    }
                                    m.setDefinitions(domainDefs);
                                    domainMeanings.add(m);
                                }
                            }
                            item.setMeanings(domainMeanings);
                            
                            return CompletableFuture.completedFuture(item);
                        } catch (Exception e) {
                            // Proceed to fallback
                        }
                    }
                    return fetchFromFallback(item, cleanWord);
                })
                .exceptionallyCompose(ex -> fetchFromFallback(item, cleanWord));

        return Mono.fromFuture(future);
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
