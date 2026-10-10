package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.AuthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Current user profile. */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me() {
        return ApiResponse.ok(authService.me(SecurityUtils.currentUserId()));
    }

    @PatchMapping("/me")
    public ApiResponse<Map<String, Object>> updateMe(@RequestBody Map<String, Object> body) {
        String name = body == null || body.get("name") == null
                ? null : String.valueOf(body.get("name"));
        Integer targetScore = body != null && body.get("targetScore") instanceof Number n
                ? n.intValue() : null;
        return ApiResponse.ok(
                authService.updateMe(SecurityUtils.currentUserId(), name, targetScore),
                "Đã cập nhật thông tin.");
    }
}
