package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.TestStartRequest;
import com.toeictrainer.dto.TestSubmitRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.MockTestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Mini/Half/Full mock tests — questions served without answers until submit. */
@RestController
@RequestMapping("/api/tests")
public class TestController {

    private final MockTestService mockTestService;

    public TestController(MockTestService mockTestService) {
        this.mockTestService = mockTestService;
    }

    @PostMapping("/start")
    public ApiResponse<Map<String, Object>> start(@RequestBody TestStartRequest req) {
        return ApiResponse.ok(
                mockTestService.start(SecurityUtils.currentUserId(), req == null ? null : req.kind()),
                "Đã tạo bài thi.");
    }

    @GetMapping("/{id}/questions")
    public ApiResponse<Map<String, Object>> questions(@PathVariable UUID id) {
        return ApiResponse.ok(mockTestService.testQuestions(SecurityUtils.currentUserId(), id));
    }

    @PostMapping("/{id}/submit")
    public ApiResponse<Map<String, Object>> submit(@PathVariable UUID id,
                                                   @RequestBody TestSubmitRequest req) {
        return ApiResponse.ok(
                mockTestService.submit(SecurityUtils.currentUserId(), id,
                        req == null ? null : req.answers()),
                "Đã nộp bài thi.");
    }

    @GetMapping("/{id}/result")
    public ApiResponse<Map<String, Object>> result(@PathVariable UUID id) {
        return ApiResponse.ok(mockTestService.result(SecurityUtils.currentUserId(), id));
    }
}
