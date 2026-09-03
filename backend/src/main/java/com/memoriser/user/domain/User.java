package com.memoriser.user.domain;

import java.time.Instant;

public class User {
    private String id;
    private String googleSubjectId;
    private String email;
    private Instant createdAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getGoogleSubjectId() { return googleSubjectId; }
    public void setGoogleSubjectId(String googleSubjectId) { this.googleSubjectId = googleSubjectId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
