package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.FlashcardReviewRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.VocabService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** SRS flashcards: due words and rating reviews. */
@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {

    private final VocabService vocabService;

    public FlashcardController(VocabService vocabService) {
        this.vocabService = vocabService;
    }

    @GetMapping("/due")
    public ApiResponse<List<Map<String, Object>>> due(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(vocabService.dueFlashcards(SecurityUtils.currentUserId(), limit));
    }

    @PostMapping("/review")
    public ApiResponse<Map<String, Object>> review(@RequestBody FlashcardReviewRequest req) {
        return ApiResponse.ok(vocabService.reviewFlashcard(
                SecurityUtils.currentUserId(),
                req == null ? null : req.wordId(),
                req == null ? null : req.customWordId(),
                req == null ? null : req.rating()));
    }
}
