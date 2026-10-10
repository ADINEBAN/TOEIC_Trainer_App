package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** User's own word. */
@Entity
@Table(name = "custom_words")
@Getter
@Setter
@NoArgsConstructor
public class CustomWord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String word;

    private String ipa;

    @Column(name = "part_of_speech")
    private String partOfSpeech;

    @Column(name = "meaning_vi")
    private String meaningVi;

    @Column(name = "definition_en", columnDefinition = "TEXT")
    private String definitionEn;

    @Column(name = "example_en", columnDefinition = "TEXT")
    private String exampleEn;

    @Column(name = "example_vi", columnDefinition = "TEXT")
    private String exampleVi;

    private String topic;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
