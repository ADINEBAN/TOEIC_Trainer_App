package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.PlacementSubmitRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.PlacementService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/placement")
public class PlacementController {

    private final PlacementService placementService;

    public PlacementController(PlacementService placementService) {
        this.placementService = placementService;
    }

    @GetMapping("/quiz")
    public ApiResponse<List<Map<String, Object>>> quiz() {
        return ApiResponse.ok(placementService.getQuiz());
    }

    @PostMapping("/submit")
    public ApiResponse<Map<String, Object>> submit(@RequestBody PlacementSubmitRequest req) {
        return ApiResponse.ok(
                placementService.submit(SecurityUtils.currentUserId(), req),
                "Đã hoàn thành bài kiểm tra đầu vào.");
    }

    @GetMapping("/history")
    public ApiResponse<List<Map<String, Object>>> history() {
        return ApiResponse.ok(placementService.history(SecurityUtils.currentUserId()));
    }
}
