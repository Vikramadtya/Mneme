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
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        if (request.getMethod() == HttpMethod.OPTIONS) {
            MutableHttpResponse<?> response = HttpResponse.ok();
            response.header("Access-Control-Allow-Origin", "*");
            response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            response.header("Access-Control-Max-Age", "3600");
            return Mono.just(response);
        }

        return Mono.from(chain.proceed(request))
                .map(response -> {
                    response.header("Access-Control-Allow-Origin", "*");
                    response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    response.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
                    return response;
                });
    }
}
