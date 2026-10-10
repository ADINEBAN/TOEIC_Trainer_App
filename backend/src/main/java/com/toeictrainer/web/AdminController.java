package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.common.PagedResult;
import com.toeictrainer.dto.AuthResponse;
import com.toeictrainer.dto.GrammarLessonRequest;
import com.toeictrainer.dto.LoginRequest;
import com.toeictrainer.dto.QuestionRequest;
import com.toeictrainer.dto.VocabularyRequest;
import com.toeictrainer.service.AdminService;
import com.toeictrainer.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin endpoints — ROLE_ADMIN enforced by SecurityConfig (except /login). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    public AdminController(AdminService adminService, AuthService authService) {
        this.adminService = adminService;
        this.authService = authService;
    }

    /** Admin sign-in (public). Requires an account with ROLE_ADMIN. */
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok(authService.adminLogin(req), "Đăng nhập quản trị thành công.");
    }

    @GetMapping("/overview")
    public ApiResponse<Map<String, Object>> overview() {
        return ApiResponse.ok(adminService.overview());
    }

    @GetMapping("/users")
    public ApiResponse<PagedResult<Map<String, Object>>> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PagedResult.of(adminService.listUsers(page, size)));
    }

    // ---------------- Vocabulary ----------------
    // The app calls /api/admin/vocabulary; the legacy /api/admin/vocab path is kept.
    @GetMapping({"/vocab", "/vocabulary"})
    public ApiResponse<PagedResult<Map<String, Object>>> vocab(
            @RequestParam(required = false) String topic,
            @RequestParam(required = false, name = "search") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PagedResult.of(adminService.listVocabulary(topic, q, page, size)));
    }

    @PostMapping({"/vocab", "/vocabulary"})
    public ApiResponse<Map<String, Object>> createVocab(@Valid @RequestBody VocabularyRequest req) {
        return ApiResponse.ok(adminService.createVocabulary(req), "Đã thêm từ vựng.");
    }

    @PutMapping({"/vocab/{id}", "/vocabulary/{id}"})
    public ApiResponse<Map<String, Object>> updateVocab(
            @PathVariable UUID id, @Valid @RequestBody VocabularyRequest req) {
        return ApiResponse.ok(adminService.updateVocabulary(id, req), "Đã cập nhật từ vựng.");
    }

    @DeleteMapping({"/vocab/{id}", "/vocabulary/{id}"})
    public ApiResponse<Map<String, String>> deleteVocab(@PathVariable UUID id) {
        adminService.deleteVocabulary(id);
        return ApiResponse.ok(Map.of(), "Đã xóa từ vựng.");
    }

    // ---------------- Questions ----------------
    @GetMapping("/questions")
    public ApiResponse<PagedResult<Map<String, Object>>> questions(
            @RequestParam(required = false) Integer part,
            @RequestParam(required = false) String mode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Map<String, Object>> all = adminService.listQuestions(part, mode);
        int total = all.size();
        int from = Math.min(page * size, total);
        int to = Math.min(from + size, total);
        return ApiResponse.ok(PagedResult.of(new PageImpl<>(all.subList(from, to), PageRequest.of(page, size), total)));
    }

    @PostMapping("/questions")
    public ApiResponse<Map<String, Object>> createQuestion(@Valid @RequestBody QuestionRequest req) {
        return ApiResponse.ok(adminService.createQuestion(req), "Đã thêm câu hỏi.");
    }

    @PutMapping("/questions/{id}")
    public ApiResponse<Map<String, Object>> updateQuestion(
            @PathVariable UUID id, @Valid @RequestBody QuestionRequest req) {
        return ApiResponse.ok(adminService.updateQuestion(id, req), "Đã cập nhật câu hỏi.");
    }

    @DeleteMapping("/questions/{id}")
    public ApiResponse<Map<String, String>> deleteQuestion(@PathVariable UUID id) {
        adminService.deleteQuestion(id);
        return ApiResponse.ok(Map.of(), "Đã xóa câu hỏi.");
    }

    // ---------------- Grammar lessons ----------------
    @GetMapping("/grammar")
    public ApiResponse<List<Map<String, Object>>> grammar() {
        return ApiResponse.ok(adminService.listGrammar());
    }

    @PostMapping("/grammar")
    public ApiResponse<Map<String, Object>> createGrammar(@Valid @RequestBody GrammarLessonRequest req) {
        return ApiResponse.ok(adminService.createGrammar(req), "Đã thêm bài ngữ pháp.");
    }

    @PutMapping("/grammar/{id}")
    public ApiResponse<Map<String, Object>> updateGrammar(
            @PathVariable UUID id, @Valid @RequestBody GrammarLessonRequest req) {
        return ApiResponse.ok(adminService.updateGrammar(id, req), "Đã cập nhật bài ngữ pháp.");
    }

    @DeleteMapping("/grammar/{id}")
    public ApiResponse<Map<String, String>> deleteGrammar(@PathVariable UUID id) {
        adminService.deleteGrammar(id);
        return ApiResponse.ok(Map.of(), "Đã xóa bài ngữ pháp.");
    }
}
