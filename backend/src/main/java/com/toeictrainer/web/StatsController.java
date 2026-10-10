package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.StudyTimeRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> stats() {
        return ApiResponse.ok(statsService.getStats(SecurityUtils.currentUserId()));
    }

    @PostMapping("/study-time")
    public ApiResponse<Map<String, Object>> studyTime(@RequestBody StudyTimeRequest req) {
        return ApiResponse.ok(
                statsService.addStudyTime(SecurityUtils.currentUserId(), req.seconds()),
                "Đã ghi nhận thời gian học.");
    }
}
