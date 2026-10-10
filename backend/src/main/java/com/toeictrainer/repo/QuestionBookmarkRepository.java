package com.toeictrainer.repo;

import com.toeictrainer.domain.QuestionBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionBookmarkRepository extends JpaRepository<QuestionBookmark, UUID> {
    List<QuestionBookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<QuestionBookmark> findByUserIdAndQuestionId(UUID userId, UUID questionId);

    void deleteByUserIdAndQuestionId(UUID userId, UUID questionId);
}
