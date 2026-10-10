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

public interface PlacementResultRepository extends JpaRepository<PlacementResult, UUID> {
    List<PlacementResult> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<PlacementResult> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
}
