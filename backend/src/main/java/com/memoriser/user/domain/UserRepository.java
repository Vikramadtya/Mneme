package com.memoriser.user.domain;

import org.reactivestreams.Publisher;

public interface UserRepository {
    Publisher<User> findByEmail(String email);
    Publisher<User> findByGoogleSubjectId(String subjectId);
    Publisher<User> save(User user);
}
