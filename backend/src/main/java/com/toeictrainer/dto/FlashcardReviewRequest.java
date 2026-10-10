package com.toeictrainer.dto;

import java.util.UUID;

/** Review one flashcard with an SRS rating: again|hard|good|easy. */
public record FlashcardReviewRequest(
        UUID wordId,
        UUID customWordId,
        String rating) {
}
