package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** AI-generated semantic relation between words; persisted after first generation. */
@Entity
@Table(name = "word_relations")
@Getter
@Setter
@NoArgsConstructor
public class WordRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "word_id", nullable = false)
    private UUID wordId;

    @Column(name = "related_word_id")
    private UUID relatedWordId;

    @Column(name = "related_word", nullable = false)
    private String relatedWord;

    @Column(name = "relation_type", nullable = false)
    private String relationType; // synonym|antonym|word_family|collocation|related

    @Column(name = "example_en", columnDefinition = "TEXT")
    private String exampleEn;

    @Column(name = "example_vi", columnDefinition = "TEXT")
    private String exampleVi;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
