package com.memoriser.vocabulary.infrastructure;

import io.micronaut.data.annotation.GeneratedValue;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;
import java.util.List;
import java.time.Instant;

@MappedEntity("collections")
public class MongoVocabularyCollection {
    @Id
    @GeneratedValue
    private String id;
    private String name;
    private String description;
    private String userId;
    private List<String> wordIds;
    private Instant createdAt;

    public MongoVocabularyCollection() {}

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
