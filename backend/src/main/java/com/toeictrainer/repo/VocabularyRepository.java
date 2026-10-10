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

public interface VocabularyRepository extends JpaRepository<Vocabulary, UUID> {
    @Query("SELECT v FROM Vocabulary v WHERE (:topic IS NULL OR v.topic = :topic) "
            + "AND (:q IS NULL OR LOWER(v.word) LIKE LOWER(CONCAT('%', :q, '%')) "
            + "OR LOWER(v.meaningVi) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Vocabulary> search(@Param("topic") String topic, @Param("q") String q, Pageable pageable);

    List<Vocabulary> findByTopic(String topic);

    @Query(value = "SELECT * FROM vocabulary ORDER BY random() LIMIT :limit", nativeQuery = true)
    List<Vocabulary> findRandom(@Param("limit") int limit);

    @Query("SELECT DISTINCT v.topic FROM Vocabulary v WHERE v.topic IS NOT NULL AND v.topic <> '' ORDER BY v.topic")
    List<String> findDistinctTopics();
}
