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

public interface PracticeAttemptRepository extends JpaRepository<PracticeAttempt, UUID> {
    List<PracticeAttempt> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT COUNT(a) FROM PracticeAttempt a WHERE a.createdAt >= :since")
    long countSince(@Param("since") Instant since);
}
