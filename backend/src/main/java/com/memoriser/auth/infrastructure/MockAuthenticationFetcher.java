package com.memoriser.auth.infrastructure;

import io.micronaut.context.annotation.Value;
import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.filters.AuthenticationFetcher;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

@Singleton
public class MockAuthenticationFetcher implements AuthenticationFetcher<HttpRequest<?>> {

    private final String mockUserId;

    public MockAuthenticationFetcher(@Value("${memoriser.auth.mock-user-id:0000-0000-0000-0000}") String mockUserId) {
        this.mockUserId = mockUserId;
    }

    @Override
    public Publisher<Authentication> fetchAuthentication(HttpRequest<?> request) {
        return Mono.just(Authentication.build(mockUserId));
    }
}
