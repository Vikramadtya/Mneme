package com.memoriser.vocabulary.presentation;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.json.JsonMapper;
import jakarta.inject.Inject;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Controller("/api/v1/dictionary")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class DictionaryController {

    @Inject
    JsonMapper jsonMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Get("/{word}")
    public Mono<Map<String, String>> fetchDefinition(@PathVariable String word) {
        String cleanWord = word.trim().toLowerCase();
        System.out.println("Fetching definition for: " + cleanWord);
        
        HttpRequest requestPrimary = HttpRequest.newBuilder()
                .uri(URI.create("https://api.dictionaryapi.dev/api/v2/entries/en/" + cleanWord))
                .timeout(Duration.ofMillis(1500))
                .GET()
                .build();

        CompletableFuture<Map<String, String>> future = httpClient.sendAsync(requestPrimary, HttpResponse.BodyHandlers.ofString())
                .thenCompose(response -> {
                    System.out.println("Primary API responded with: " + response.statusCode());
                    if (response.statusCode() == 200) {
                        try {
                            List<Map> responseList = jsonMapper.readValue(response.body().getBytes(), io.micronaut.core.type.Argument.of(List.class, Map.class));
                            Map<String, Object> entry = (Map<String, Object>) responseList.get(0);
                            
                            Map<String, String> result = new HashMap<>();
                            if (entry.containsKey("phonetic")) {
                                result.put("pronunciation", (String) entry.get("phonetic"));
                            }
                            
                            List<Map<String, Object>> meanings = (List<Map<String, Object>>) entry.get("meanings");
                            for (Map<String, Object> meaning : meanings) {
                                List<Map<String, Object>> definitions = (List<Map<String, Object>>) meaning.get("definitions");
                                for (Map<String, Object> def : definitions) {
                                    if (!result.containsKey("definition")) {
                                        result.put("definition", (String) def.get("definition"));
                                    }
                                    if (!result.containsKey("example") && def.containsKey("example")) {
                                        result.put("example", (String) def.get("example"));
                                    }
                                }
                            }
                            return CompletableFuture.completedFuture(result);
                        } catch (Exception e) {
                            System.err.println("Primary API Parsing error: " + e.getMessage());
                            e.printStackTrace();
                            // Proceed to fallback
                        }
                    }
                    return fetchFromFallback(cleanWord);
                })
                .exceptionallyCompose(ex -> {
                    System.err.println("Primary API failed entirely: " + ex.getMessage());
                    return fetchFromFallback(cleanWord);
                });

        return Mono.fromFuture(future);
    }

    private CompletableFuture<Map<String, String>> fetchFromFallback(String cleanWord) {
        System.out.println("Trying Datamuse fallback API for: " + cleanWord);
        HttpRequest requestFallback = HttpRequest.newBuilder()
                .uri(URI.create("https://api.datamuse.com/words?sp=" + cleanWord + "&md=dp&max=1"))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        return httpClient.sendAsync(requestFallback, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    Map<String, String> result = new HashMap<>();
                    System.out.println("Fallback API responded with: " + response.statusCode());
                    if (response.statusCode() != 200) {
                        result.put("error", "Both Dictionary APIs are currently unavailable.");
                        return result;
                    }
                    try {
                        List<Map> responseList = jsonMapper.readValue(response.body().getBytes(), io.micronaut.core.type.Argument.of(List.class, Map.class));
                        if (responseList == null || responseList.isEmpty()) {
                            result.put("error", "Word not found in fallback dictionary.");
                            return result;
                        }
                        
                        Map<String, Object> entry = (Map<String, Object>) responseList.get(0);
                        
                        // Parse definitions
                        if (entry.containsKey("defs")) {
                            List<String> defs = (List<String>) entry.get("defs");
                            if (defs != null && !defs.isEmpty()) {
                                String rawDef = defs.get(0);
                                int tabIndex = rawDef.indexOf('\t');
                                if (tabIndex != -1) {
                                    result.put("definition", rawDef.substring(tabIndex + 1).trim());
                                } else {
                                    result.put("definition", rawDef.trim());
                                }
                            }
                        }

                        // Parse pronunciation if available in tags
                        if (entry.containsKey("tags")) {
                            List<String> tags = (List<String>) entry.get("tags");
                            if (tags != null) {
                                for (String tag : tags) {
                                    if (tag.startsWith("pron:")) {
                                        result.put("pronunciation", "/" + tag.substring(5).trim().toLowerCase() + "/");
                                        break;
                                    }
                                }
                            }
                        }

                        if (!result.containsKey("definition")) {
                            result.put("error", "Word found but no definition available.");
                        }

                    } catch (Exception e) {
                        System.err.println("Fallback API Parsing error: " + e.getMessage());
                        e.printStackTrace();
                        result.put("error", "Failed to parse fallback dictionary response.");
                    }
                    return result;
                })
                .exceptionally(ex -> {
                    System.err.println("Fallback API failed entirely: " + ex.getMessage());
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "All Dictionary APIs are temporarily unavailable. Please type manually for now.");
                    return error;
                });
    }
}
