package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.User;
import com.toeictrainer.domain.UserStats;
import com.toeictrainer.repo.UserRepository;
import com.toeictrainer.repo.UserStatsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Onboarding: save the learner's goal and return a starter roadmap. */
@Service
public class OnboardingService {

    private final UserRepository users;
    private final UserStatsRepository stats;
    private final StatsService statsService;

    public OnboardingService(UserRepository users,
                             UserStatsRepository stats,
                             StatsService statsService) {
        this.users = users;
        this.stats = stats;
        this.statsService = statsService;
    }

    /**
     * POST /api/onboarding/complete — stores targetScore on the user and the
     * daily goal on user_stats, then returns a PlacementResult-like payload
     * {estimatedScore, level, roadmap[]} derived from the target.
     */
    @Transactional
    public Map<String, Object> complete(UUID userId, Integer targetScore,
                                        Integer minutesPerDay, List<Integer> studyDays) {
        if (targetScore == null || targetScore < 10 || targetScore > 990) {
            throw ApiException.badRequest("Điểm mục tiêu phải từ 10 đến 990.");
        }
        int minutes = minutesPerDay == null ? 30 : Math.min(Math.max(minutesPerDay, 5), 480);
        List<Integer> days = studyDays == null ? List.of() : studyDays;

        User user = users.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không tồn tại."));
        user.setTargetScore(targetScore);
        users.save(user);

        UserStats s = stats.findById(userId).orElseGet(() -> {
            UserStats fresh = new UserStats();
            fresh.setUserId(userId);
            return fresh;
        });
        s.setDailyGoalMinutes(minutes);
        stats.save(s);
        statsService.touchActive(userId);

        String level = levelFor(targetScore);
        List<Map<String, String>> roadmap = roadmapFor(targetScore, minutes, days);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("estimatedScore", 0);
        out.put("level", level);
        out.put("roadmap", roadmap);
        out.put("targetScore", targetScore);
        out.put("minutesPerDay", minutes);
        return out;
    }

    private static String levelFor(int target) {
        if (target < 450) {
            return "Beginner";
        }
        if (target < 600) {
            return "Elementary";
        }
        if (target < 750) {
            return "Intermediate";
        }
        if (target < 850) {
            return "Upper-Intermediate";
        }
        return "Advanced";
    }

    private static List<Map<String, String>> roadmapFor(int target, int minutes, List<Integer> days) {
        String schedule = days.isEmpty()
                ? "mỗi ngày"
                : days.size() + " ngày/tuần";
        List<Map<String, String>> steps = new ArrayList<>();
        steps.add(step("Đặt nền tảng từ vựng",
                "Học " + minutes + " phút " + schedule + ", ưu tiên flashcard SRS để ghi nhớ lâu."));
        if (target >= 600) {
            steps.add(step("Luyện nghe Part 1–4",
                    "Nghe và nhắc lại (shadowing) 15 phút mỗi buổi để quen tốc độ đề thi thật."));
        }
        if (target >= 750) {
            steps.add(step("Luyện đọc Part 5–7",
                    "Làm 20 câu Part 5 mỗi ngày, ghi lại lỗi sai vào sổ tay để ôn lại."));
        }
        steps.add(step("Kiểm tra tiến độ",
                "Làm 1 bài Mini Test mỗi tuần. Khi điểm ước tính chạm " + target
                        + ", chuyển sang Half/Full Test đúng giờ thi thật."));
        return steps;
    }

    private static Map<String, String> step(String title, String description) {
        return Map.of("title", title, "description", description);
    }
}
