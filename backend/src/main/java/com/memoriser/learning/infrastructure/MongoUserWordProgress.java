package com.memoriser.learning.infrastructure;

import io.micronaut.data.annotation.GeneratedValue;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;
import java.time.Instant;

@MappedEntity("user_word_progress")
public class MongoUserWordProgress {
    @Id
    @GeneratedValue
    private String id;
    private String userId;
    private String wordId;
    
    private String state;
    private Double difficulty;
    private Double stability;
    private Integer reviewCount;
    private Integer successCount;
    private Integer failureCount;
    
    private Instant lastReviewedAt;
    private Instant nextReviewAt;
    private Instant createdAt;
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getWordId() { return wordId; }
    public void setWordId(String wordId) { this.wordId = wordId; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public Double getDifficulty() { return difficulty; }
    public void setDifficulty(Double difficulty) { this.difficulty = difficulty; }
    public Double getStability() { return stability; }
    public void setStability(Double stability) { this.stability = stability; }
    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }
    public Integer getSuccessCount() { return successCount; }
    public void setSuccessCount(Integer successCount) { this.successCount = successCount; }
    public Integer getFailureCount() { return failureCount; }
    public void setFailureCount(Integer failureCount) { this.failureCount = failureCount; }
    public Instant getLastReviewedAt() { return lastReviewedAt; }
    public void setLastReviewedAt(Instant lastReviewedAt) { this.lastReviewedAt = lastReviewedAt; }
    public Instant getNextReviewAt() { return nextReviewAt; }
    public void setNextReviewAt(Instant nextReviewAt) { this.nextReviewAt = nextReviewAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
