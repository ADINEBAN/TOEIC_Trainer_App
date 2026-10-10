package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Home dashboard stats. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok(dashboardService.dashboard(SecurityUtils.currentUserId()));
    }
}
