package com.toeictrainer.repo;

import com.toeictrainer.domain.TestSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TestSessionRepository extends JpaRepository<TestSession, UUID> {
    Optional<TestSession> findByIdAndUserId(UUID id, UUID userId);

    List<TestSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
