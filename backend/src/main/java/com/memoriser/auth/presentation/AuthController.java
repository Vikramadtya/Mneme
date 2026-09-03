package com.memoriser.auth.presentation;

import com.memoriser.auth.infrastructure.GoogleAuthClient;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.token.jwt.generator.JwtTokenGenerator;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller("/api/v1/auth")
@Secured(SecurityRule.IS_ANONYMOUS)
public class AuthController {
    
    private static final Logger LOG = LoggerFactory.getLogger(AuthController.class);

    private final JwtTokenGenerator jwtTokenGenerator;
    private final GoogleAuthClient googleClient;

    @Inject
    public AuthController(JwtTokenGenerator jwtTokenGenerator, GoogleAuthClient googleClient) {
        this.jwtTokenGenerator = jwtTokenGenerator;
        this.googleClient = googleClient;
    }

    @Post("/login")
    public Mono<MutableHttpResponse<Object>> login(@Body Map<String, String> payload) {
        String accessTokenString = payload.get("token");
        if (accessTokenString == null || accessTokenString.isEmpty()) {
            return Mono.just(HttpResponse.badRequest("Missing token"));
        }

        try {
            return googleClient.getUserInfo("Bearer " + accessTokenString)
                    .map(userInfo -> {
                        String email = (String) userInfo.get("email");
                        String subject = (String) userInfo.get("sub");

                        if (subject == null) {
                            return HttpResponse.<Object>unauthorized();
                        }

                        // Internal UUID is just the Google Sub for now
                        String internalUserId = subject;

                        Authentication authentication = Authentication.build(internalUserId, Collections.emptyList(), Map.of("email", email != null ? email : ""));
                        
                        Optional<String> accessToken = jwtTokenGenerator.generateToken(authentication, 86400 * 30); // 30 days
                        
                        if (accessToken.isPresent()) {
                            Map<String, String> response = new HashMap<>();
                            response.put("access_token", accessToken.get());
                            return HttpResponse.<Object>ok(response);
                        } else {
                            return HttpResponse.<Object>serverError("Failed to generate JWT");
                        }
                    })
                    .onErrorResume(e -> {
                        LOG.error("Failed to fetch Google user info", e);
                        return Mono.just(HttpResponse.<Object>unauthorized());
                    });

        } catch (Exception e) {
            LOG.error("Exception during login", e);
            return Mono.just(HttpResponse.<Object>unauthorized());
        }
    }
}
