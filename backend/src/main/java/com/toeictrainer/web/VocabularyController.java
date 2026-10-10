package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.common.PagedResult;
import com.toeictrainer.dto.CustomWordRequest;
import com.toeictrainer.dto.WordProgressRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.VocabService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
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

@RestController
@RequestMapping("/api")
public class VocabularyController {

    private final VocabService vocabService;

    public VocabularyController(VocabService vocabService) {
        this.vocabService = vocabService;
    }

    @GetMapping("/vocab")
    public ApiResponse<PagedResult<Map<String, Object>>> vocab(
            @RequestParam(required = false) String topic,
            @RequestParam(required = false, name = "search") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(PagedResult.of(vocabService.searchVocab(topic, q, page, size)));
    }

    @GetMapping("/vocab/{id}")
    public ApiResponse<Map<String, Object>> vocabById(@PathVariable UUID id) {
        return ApiResponse.ok(vocabService.getVocab(id));
    }

    @GetMapping("/vocab/topics")
    public ApiResponse<List<String>> vocabTopics() {
        return ApiResponse.ok(vocabService.topics());
    }

    /** App alias of POST /api/words/custom — same logic kept. */
    @PostMapping("/vocab/custom")
    public ApiResponse<Map<String, Object>> createCustomWordAlias(@Valid @RequestBody CustomWordRequest req) {
        return ApiResponse.ok(
                vocabService.createCustomWord(SecurityUtils.currentUserId(), req), "Đã thêm từ mới.");
    }

    /** App alias of PUT /api/words/custom/{id} — same logic kept. */
    @PutMapping("/vocab/custom/{id}")
    public ApiResponse<Map<String, Object>> updateCustomWordAlias(
            @PathVariable UUID id, @Valid @RequestBody CustomWordRequest req) {
        return ApiResponse.ok(
                vocabService.updateCustomWord(SecurityUtils.currentUserId(), id, req), "Đã cập nhật từ.");
    }

    /** App alias of DELETE /api/words/custom/{id} — same logic kept. */
    @DeleteMapping("/vocab/custom/{id}")
    public ApiResponse<Map<String, String>> deleteCustomWordAlias(@PathVariable UUID id) {
        vocabService.deleteCustomWord(SecurityUtils.currentUserId(), id);
        return ApiResponse.ok(Map.of(), "Đã xóa từ.");
    }

    @GetMapping("/words/custom")
    public ApiResponse<List<Map<String, Object>>> customWords() {
        return ApiResponse.ok(vocabService.listCustomWords(SecurityUtils.currentUserId()));
    }

    @PostMapping("/words/custom")
    public ApiResponse<Map<String, Object>> createCustomWord(@Valid @RequestBody CustomWordRequest req) {
        return ApiResponse.ok(
                vocabService.createCustomWord(SecurityUtils.currentUserId(), req), "Đã thêm từ mới.");
    }

    @PutMapping("/words/custom/{id}")
    public ApiResponse<Map<String, Object>> updateCustomWord(
            @PathVariable UUID id, @Valid @RequestBody CustomWordRequest req) {
        return ApiResponse.ok(
                vocabService.updateCustomWord(SecurityUtils.currentUserId(), id, req), "Đã cập nhật từ.");
    }

    @DeleteMapping("/words/custom/{id}")
    public ApiResponse<Map<String, String>> deleteCustomWord(@PathVariable UUID id) {
        vocabService.deleteCustomWord(SecurityUtils.currentUserId(), id);
        return ApiResponse.ok(Map.of(), "Đã xóa từ.");
    }

    @PostMapping("/words/progress")
    public ApiResponse<Map<String, Object>> upsertProgress(@RequestBody WordProgressRequest req) {
        return ApiResponse.ok(vocabService.upsertProgress(SecurityUtils.currentUserId(), req));
    }

    @GetMapping("/words/progress")
    public ApiResponse<List<Map<String, Object>>> progress(
            @RequestParam(defaultValue = "false") boolean dueOnly) {
        return ApiResponse.ok(vocabService.listProgress(SecurityUtils.currentUserId(), dueOnly));
    }
}
