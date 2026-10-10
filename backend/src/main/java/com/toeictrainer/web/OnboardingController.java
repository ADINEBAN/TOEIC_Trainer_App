package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.OnboardingService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Onboarding: save the learner's goal and get a starter roadmap. */
@RestController
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private final OnboardingService onboardingService;

    public OnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @PostMapping("/complete")
    public ApiResponse<Map<String, Object>> complete(@RequestBody Map<String, Object> body) {
        Integer targetScore = numberOf(body, "targetScore");
        Integer minutesPerDay = numberOf(body, "minutesPerDay");
        List<Integer> studyDays = daysOf(body);
        return ApiResponse.ok(
                onboardingService.complete(SecurityUtils.currentUserId(),
                        targetScore, minutesPerDay, studyDays),
                "Đã lưu mục tiêu học tập.");
    }

    private static Integer numberOf(Map<String, Object> body, String key) {
        if (body == null || !(body.get(key) instanceof Number n)) {
            return null;
        }
        return n.intValue();
    }

    @SuppressWarnings("unchecked")
    private static List<Integer> daysOf(Map<String, Object> body) {
        if (body == null || !(body.get("studyDays") instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(o -> o instanceof Number)
                .map(o -> ((Number) o).intValue())
                .toList();
    }
}
