package com.memoriser.user.infrastructure;

import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;
import java.time.Instant;

@MappedEntity("users")
public class MongoUser {
    @Id
    private String id;
    private String googleSubjectId;
    private String email;
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getGoogleSubjectId() { return googleSubjectId; }
    public void setGoogleSubjectId(String googleSubjectId) { this.googleSubjectId = googleSubjectId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
