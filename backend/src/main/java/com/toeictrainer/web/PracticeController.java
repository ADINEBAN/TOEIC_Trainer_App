package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.PracticeSubmitRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.PracticeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/practice")
public class PracticeController {

    private final PracticeService practiceService;

    public PracticeController(PracticeService practiceService) {
        this.practiceService = practiceService;
    }

    @GetMapping("/questions")
    public ApiResponse<List<Map<String, Object>>> questions(
            @RequestParam(required = false) Integer part,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(practiceService.getQuestions(part, limit));
    }

    @PostMapping("/attempts")
    public ApiResponse<Map<String, Object>> submit(@Valid @RequestBody PracticeSubmitRequest req) {
        return ApiResponse.ok(
                practiceService.submitAttempt(SecurityUtils.currentUserId(), req), "Đã nộp bài.");
    }

    @GetMapping("/attempts")
    public ApiResponse<List<Map<String, Object>>> attempts() {
        return ApiResponse.ok(practiceService.listAttempts(SecurityUtils.currentUserId()));
    }

    @GetMapping("/mistakes")
    public ApiResponse<List<Map<String, Object>>> mistakes() {
        return ApiResponse.ok(practiceService.mistakes(SecurityUtils.currentUserId()));
    }
}
