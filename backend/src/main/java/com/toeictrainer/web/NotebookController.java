package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.NotebookService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Notebook: saved words (favorites), bookmarked questions, mistakes. */
@RestController
@RequestMapping("/api/notebook")
public class NotebookController {

    private final NotebookService notebookService;

    public NotebookController(NotebookService notebookService) {
        this.notebookService = notebookService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> notebook() {
        return ApiResponse.ok(notebookService.notebook(SecurityUtils.currentUserId()));
    }

    @PostMapping("/saved-words")
    public ApiResponse<Map<String, String>> saveWord(@RequestBody Map<String, Object> body) {
        UUID[] ids = resolveIds(body == null ? null : idOf(body, "wordId"),
                body == null ? null : idOf(body, "customWordId"),
                body == null ? null : body.get("custom"));
        notebookService.setSavedWord(SecurityUtils.currentUserId(), ids[0], ids[1], true);
        return ApiResponse.ok(Map.of(), "Đã lưu từ vào sổ tay.");
    }

    @DeleteMapping("/saved-words")
    public ApiResponse<Map<String, String>> unsaveWord(
            @RequestParam(required = false) String wordId,
            @RequestParam(required = false) String customWordId,
            @RequestParam(required = false, defaultValue = "false") boolean custom) {
        UUID[] ids = resolveIds(parseId(wordId), parseId(customWordId), custom);
        notebookService.setSavedWord(SecurityUtils.currentUserId(), ids[0], ids[1], false);
        return ApiResponse.ok(Map.of(), "Đã bỏ lưu từ.");
    }

    /**
     * The app sends either {wordId} (+optional customWordId) or {wordId, custom:true}.
     * With custom=true, wordId is treated as the custom word's id.
     */
    private static UUID[] resolveIds(UUID wordId, UUID customWordId, Object customFlag) {
        boolean custom = Boolean.TRUE.equals(customFlag)
                || "true".equalsIgnoreCase(String.valueOf(customFlag));
        if (custom && customWordId == null) {
            return new UUID[]{null, wordId};
        }
        return new UUID[]{wordId, customWordId};
    }

    @PostMapping("/bookmarks")
    public ApiResponse<Map<String, String>> bookmark(@RequestBody Map<String, String> body) {
        UUID questionId = body == null ? null : parseId(body.get("questionId"));
        if (questionId == null) {
            throw com.toeictrainer.common.ApiException.badRequest("Thiếu questionId.");
        }
        notebookService.addBookmark(SecurityUtils.currentUserId(), questionId);
        return ApiResponse.ok(Map.of(), "Đã đánh dấu câu hỏi.");
    }

    @DeleteMapping("/bookmarks")
    public ApiResponse<Map<String, String>> unbookmark(@RequestParam String questionId) {
        UUID id = parseId(questionId);
        if (id == null) {
            throw com.toeictrainer.common.ApiException.badRequest("Thiếu questionId.");
        }
        notebookService.removeBookmark(SecurityUtils.currentUserId(), id);
        return ApiResponse.ok(Map.of(), "Đã bỏ đánh dấu câu hỏi.");
    }

    private static UUID idOf(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) {
            return null;
        }
        return parseId(String.valueOf(body.get(key)));
    }

    private static UUID parseId(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(s.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
