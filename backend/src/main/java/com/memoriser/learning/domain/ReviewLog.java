package com.memoriser.learning.domain;

import java.time.Instant;

public class ReviewLog {
    private String id;
    private String userId;
    private String wordId;
    private int grade;
    private Instant reviewedAt;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getWordId() { return wordId; }
    public void setWordId(String wordId) { this.wordId = wordId; }
    public int getGrade() { return grade; }
    public void setGrade(int grade) { this.grade = grade; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
}
