package com.toeictrainer.repo;

import com.toeictrainer.domain.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WordProgressRepository extends JpaRepository<WordProgress, UUID> {
    List<WordProgress> findByUserId(UUID userId);
    Optional<WordProgress> findByUserIdAndWordId(UUID userId, UUID wordId);
    Optional<WordProgress> findByUserIdAndCustomWordId(UUID userId, UUID customWordId);
    List<WordProgress> findByUserIdAndNextReviewAtBefore(UUID userId, Instant now);
    List<WordProgress> findByUserIdAndFavoriteTrue(UUID userId);
}
