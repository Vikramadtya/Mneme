package com.memoriser.auth.infrastructure;

import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.client.annotation.Client;
import reactor.core.publisher.Mono;

import java.util.Map;

@Client("https://www.googleapis.com")
public interface GoogleAuthClient {
    @Get("/oauth2/v3/userinfo")
    Mono<Map<String, Object>> getUserInfo(@Header("Authorization") String authorization);
}
