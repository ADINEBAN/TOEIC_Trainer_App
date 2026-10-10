package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Cost-control + abuse-detection log for every AI call. */
@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
public class AiUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String feature; // semantic|photo|doc|tutor|speaking

    @Column(name = "input_chars", nullable = false)
    private int inputChars = 0;

    @Column(name = "output_chars", nullable = false)
    private int outputChars = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
