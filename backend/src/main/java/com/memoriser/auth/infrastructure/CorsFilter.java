package com.memoriser.auth.infrastructure;

import io.micronaut.http.HttpMethod;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

@Filter("/**")
public class CorsFilter implements HttpServerFilter {

    @Override
    @SuppressWarnings({"unchecked", "rawtypes"})
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        if (request.getMethod() == HttpMethod.OPTIONS) {
            MutableHttpResponse response = HttpResponse.ok();
            applyHeaders(response);
            return Mono.just(response);
        }

        Mono<MutableHttpResponse> proceed = Mono.from((Publisher) chain.proceed(request));
        
        return (Publisher) proceed
                .map(response -> {
                    applyHeaders(response);
                    return response;
                })
                .onErrorResume(throwable -> {
                    MutableHttpResponse errorResponse = HttpResponse.serverError();
                    applyHeaders(errorResponse);
                    return Mono.just(errorResponse);
                });
    }

    private void applyHeaders(MutableHttpResponse<?> response) {
        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
        response.header("Access-Control-Max-Age", "3600");
    }
}
