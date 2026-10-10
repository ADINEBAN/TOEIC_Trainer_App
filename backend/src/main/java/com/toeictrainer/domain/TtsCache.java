package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** System-wide TTS cache keyed by sha256(text|voice|model). */
@Entity
@Table(name = "tts_cache")
@Getter
@Setter
@NoArgsConstructor
public class TtsCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "text_hash", nullable = false, unique = true)
    private String textHash;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private String voice;

    @Column(nullable = false)
    private String model;

    @Column(columnDefinition = "bytea")
    private byte[] audio;

    @Column(nullable = false)
    private int chars = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
