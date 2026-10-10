package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.TestAnswer;
import com.toeictrainer.service.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Public grammar lessons for learners (content managed via /api/admin/grammar). */
@RestController
@RequestMapping("/api/grammar")
public class GrammarController {

    private final AdminService adminService;

    public GrammarController(AdminService adminService) {
        this.adminService = adminService;
    }

    /** Lesson summaries: {id, title, summary, level}. */
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list() {
        return ApiResponse.ok(adminService.listGrammarSummaries());
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable UUID id) {
        return ApiResponse.ok(adminService.getGrammarDetail(id));
    }

    /** Grades the lesson's mini-quiz: {score, total}. */
    @PostMapping("/{id}/quiz")
    public ApiResponse<Map<String, Object>> gradeQuiz(
            @PathVariable UUID id, @RequestBody Map<String, Object> body) {
        List<TestAnswer> answers = toAnswers(body);
        return ApiResponse.ok(adminService.gradeGrammarQuiz(id, answers), "Đã chấm bài ngữ pháp.");
    }

    @SuppressWarnings("unchecked")
    private static List<TestAnswer> toAnswers(Map<String, Object> body) {
        if (body == null || !(body.get("answers") instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(o -> o instanceof Map)
                .map(o -> (Map<String, Object>) o)
                .map(m -> new TestAnswer(
                        m.get("questionId") == null ? null : toUuid(String.valueOf(m.get("questionId"))),
                        m.get("selected") instanceof Number n ? n.intValue() : null))
                .toList();
    }

    private static UUID toUuid(String s) {
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
