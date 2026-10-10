package com.toeictrainer.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_stats")
@Getter
@Setter
@NoArgsConstructor
public class UserStats {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private int xp = 0;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int streak = 0;

    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    @Column(name = "study_seconds", nullable = false)
    private long studySeconds = 0;

    @Column(name = "daily_goal_minutes", nullable = false)
    private int dailyGoalMinutes = 60;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
