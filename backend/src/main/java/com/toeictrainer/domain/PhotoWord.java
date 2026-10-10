package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "photo_words")
@Getter
@Setter
@NoArgsConstructor
public class PhotoWord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(nullable = false)
    private String word;

    private String ipa;

    @Column(name = "meaning_vi")
    private String meaningVi;

    @Column(name = "example_en", columnDefinition = "TEXT")
    private String exampleEn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
