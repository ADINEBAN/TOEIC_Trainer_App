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

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {
    @Query("SELECT COALESCE(SUM(l.inputChars + l.outputChars), 0) FROM AiUsageLog l "
            + "WHERE l.userId = :userId AND l.createdAt >= :since")
    long sumCharsSince(@Param("userId") UUID userId, @Param("since") Instant since);
}
