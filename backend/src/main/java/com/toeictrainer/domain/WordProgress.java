package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Per-user SRS progress for one word (system word or custom word). */
@Entity
@Table(name = "word_progress")
@Getter
@Setter
@NoArgsConstructor
public class WordProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "word_id")
    private UUID wordId;

    @Column(name = "custom_word_id")
    private UUID customWordId;

    @Column(nullable = false)
    private String status = "new"; // new|learning|review|mastered

    @Column(nullable = false)
    private boolean favorite = false;

    @Column(nullable = false)
    private int repetitions = 0;

    @Column(nullable = false)
    private double easiness = 2.5;

    @Column(name = "next_review_at")
    private Instant nextReviewAt;

    @Column(name = "last_review_at")
    private Instant lastReviewAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
