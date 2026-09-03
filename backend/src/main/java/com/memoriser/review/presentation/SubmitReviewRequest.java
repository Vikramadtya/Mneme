package com.memoriser.review.presentation;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record SubmitReviewRequest(String wordId, int rating) {}
