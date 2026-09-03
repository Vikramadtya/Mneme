package com.memoriser.review.presentation;

import com.memoriser.learning.domain.UserWordProgress;
import com.memoriser.learning.domain.UserWordProgressRepository;
import com.memoriser.review.domain.ReviewScheduler;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Body;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;
import java.security.Principal;

@Controller("/api/v1/reviews")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ReviewController {

    private final UserWordProgressRepository repository;
    private final ReviewScheduler scheduler;

    public ReviewController(UserWordProgressRepository repository, ReviewScheduler scheduler) {
        this.repository = repository;
        this.scheduler = scheduler;
    }

    @Post
    public Publisher<UserWordProgress> submitReview(@Body SubmitReviewRequest request, Principal principal) {
        String userId = principal.getName();
        
        return Mono.from(repository.findByUserIdAndWordId(userId, request.wordId()))
            .switchIfEmpty(Mono.defer(() -> {
                UserWordProgress p = new UserWordProgress();
                p.setUserId(userId);
                p.setWordId(request.wordId());
                p.setState("NEW");
                p.setDifficulty(5.0);
                p.setStability(0.0);
                p.setReviewCount(0);
                p.setSuccessCount(0);
                p.setFailureCount(0);
                return Mono.just(p);
            }))
            .flatMap(progress -> {
                progress.setReviewCount(progress.getReviewCount() + 1);
                if (request.rating() > 1) {
                    progress.setSuccessCount(progress.getSuccessCount() + 1);
                } else {
                    progress.setFailureCount(progress.getFailureCount() + 1);
                }
                
                UserWordProgress updated = scheduler.calculateNextReview(progress, request.rating());
                return Mono.from(repository.save(updated));
            });
    }
}
