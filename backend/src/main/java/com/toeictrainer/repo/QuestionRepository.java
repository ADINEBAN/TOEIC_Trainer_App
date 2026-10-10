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

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    @Query(value = "SELECT * FROM questions WHERE part = :part AND mode = :mode "
            + "ORDER BY random() LIMIT :limit", nativeQuery = true)
    List<Question> findRandomByPartAndMode(
            @Param("part") int part, @Param("mode") String mode, @Param("limit") int limit);

    @Query(value = "SELECT * FROM questions WHERE mode = :mode "
            + "ORDER BY random() LIMIT :limit", nativeQuery = true)
    List<Question> findRandomByMode(@Param("mode") String mode, @Param("limit") int limit);

    List<Question> findByMode(String mode);
    List<Question> findByPartAndMode(int part, String mode);
}
