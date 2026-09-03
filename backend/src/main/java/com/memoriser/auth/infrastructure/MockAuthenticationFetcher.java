package com.memoriser.auth.infrastructure;

import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.filters.AuthenticationFetcher;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

@Singleton
public class MockAuthenticationFetcher implements AuthenticationFetcher<HttpRequest<?>> {

    @Override
    public Publisher<Authentication> fetchAuthentication(HttpRequest<?> request) {
        return Mono.just(Authentication.build("0000-0000-0000-0000"));
    }
}
