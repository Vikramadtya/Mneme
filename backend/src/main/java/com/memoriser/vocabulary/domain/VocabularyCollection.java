package com.memoriser.vocabulary.domain;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;
import java.time.Instant;

@Serdeable
public class VocabularyCollection {
    private String id;
    private String name;
    private String description;
    private String userId;
    private List<String> wordIds;
    private Instant createdAt;

    public VocabularyCollection() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public List<String> getWordIds() { return wordIds; }
    public void setWordIds(List<String> wordIds) { this.wordIds = wordIds; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
