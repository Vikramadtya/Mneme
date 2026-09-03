package com.memoriser.learning.domain;

import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;

@Serdeable
public class UserWordProgress {
    private String id;
    private String userId;
    private String wordId;
    private String state;
    private double difficulty;
    private double stability;
    private Instant lastReviewedAt;
    private Instant nextReviewAt;
    private int reviewCount;
    private int successCount;
    private int failureCount;
    private Instant createdAt;
    private Instant updatedAt;

    public UserWordProgress() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getWordId() { return wordId; }
    public void setWordId(String wordId) { this.wordId = wordId; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public double getDifficulty() { return difficulty; }
    public void setDifficulty(double difficulty) { this.difficulty = difficulty; }
    public double getStability() { return stability; }
    public void setStability(double stability) { this.stability = stability; }
    public Instant getLastReviewedAt() { return lastReviewedAt; }
    public void setLastReviewedAt(Instant lastReviewedAt) { this.lastReviewedAt = lastReviewedAt; }
    public Instant getNextReviewAt() { return nextReviewAt; }
    public void setNextReviewAt(Instant nextReviewAt) { this.nextReviewAt = nextReviewAt; }
    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }
    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }
    public int getFailureCount() { return failureCount; }
    public void setFailureCount(int failureCount) { this.failureCount = failureCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
