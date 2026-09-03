package com.memoriser.auth.presentation;

import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import java.util.Collections;
import java.util.Map;

@Controller
@Secured(SecurityRule.IS_ANONYMOUS)
public class HealthController {

    @Get("/api/v1/health")
    public HttpResponse<Map<String, String>> healthCheck() {
        return HttpResponse.ok(Collections.singletonMap("status", "UP"));
    }
}
