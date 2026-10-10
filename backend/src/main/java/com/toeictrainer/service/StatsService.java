package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.UserStats;
import com.toeictrainer.repo.UserStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/** XP / level / streak / study-time bookkeeping. */
@Service
public class StatsService {

    private final UserStatsRepository stats;

    public StatsService(UserStatsRepository stats) {
        this.stats = stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(UUID userId) {
        UserStats s = getOrCreate(userId);
        return Map.of(
                "xp", s.getXp(),
                "level", s.getLevel(),
                "streak", s.getStreak(),
                "studySeconds", s.getStudySeconds(),
                "lastActiveDate", s.getLastActiveDate() == null ? "" : s.getLastActiveDate().toString());
    }

    @Transactional
    public Map<String, Object> addStudyTime(UUID userId, long seconds) {
        if (seconds < 0 || seconds > 24 * 3600) {
            throw ApiException.badRequest("Số giây học không hợp lệ.");
        }
        UserStats s = getOrCreate(userId);
        s.setStudySeconds(s.getStudySeconds() + seconds);
        updateStreak(s);
        stats.save(s);
        return getStats(userId);
    }

    @Transactional
    public void addXp(UUID userId, int xp) {
        if (xp <= 0) {
            return;
        }
        UserStats s = getOrCreate(userId);
        s.setXp(s.getXp() + xp);
        s.setLevel(1 + s.getXp() / 1000);
        updateStreak(s);
        stats.save(s);
    }

    @Transactional
    public void touchActive(UUID userId) {
        UserStats s = getOrCreate(userId);
        updateStreak(s);
        stats.save(s);
    }

    private UserStats getOrCreate(UUID userId) {
        return stats.findById(userId).orElseGet(() -> {
            UserStats s = new UserStats();
            s.setUserId(userId);
            return stats.save(s);
        });
    }

    /** Streak: same day = keep; yesterday = +1; otherwise reset to 1. */
    static void updateStreak(UserStats s) {
        LocalDate today = LocalDate.now();
        LocalDate last = s.getLastActiveDate();
        if (last == null) {
            s.setStreak(1);
        } else if (last.equals(today)) {
            // keep
        } else if (last.equals(today.minusDays(1))) {
            s.setStreak(s.getStreak() + 1);
        } else {
            s.setStreak(1);
        }
        s.setLastActiveDate(today);
    }
}
