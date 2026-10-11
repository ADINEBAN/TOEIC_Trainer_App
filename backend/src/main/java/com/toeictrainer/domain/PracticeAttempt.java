package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;
import java.util.UUID;

/** One completed practice / mock / hands-free session. */
@Entity
@Table(name = "practice_attempts")
@Getter
@Setter
@NoArgsConstructor
public class PracticeAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String mode = "practice"; // practice|mini|half|full|handsfree

    private Integer part;

    @Column(nullable = false)
    private int score = 0;

    @Column(nullable = false)
    private int total = 0;

    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String detail = "[]";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
