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

public interface CustomWordRepository extends JpaRepository<CustomWord, UUID> {
    List<CustomWord> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<CustomWord> findByIdAndUserId(UUID id, UUID userId);
    Optional<CustomWord> findByUserIdAndWordIgnoreCase(UUID userId, String word);
    boolean existsByIdAndUserId(UUID id, UUID userId);
}
