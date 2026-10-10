package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.QuestionBookmark;
import com.toeictrainer.domain.WordProgress;
import com.toeictrainer.repo.QuestionBookmarkRepository;
import com.toeictrainer.repo.QuestionRepository;
import com.toeictrainer.repo.WordProgressRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Notebook: saved words (favorites), bookmarked questions, and mistakes. */
@Service
public class NotebookService {

    private final WordProgressRepository progress;
    private final QuestionBookmarkRepository bookmarks;
    private final QuestionRepository questions;
    private final VocabService vocabService;
    private final PracticeService practiceService;

    public NotebookService(WordProgressRepository progress,
                           QuestionBookmarkRepository bookmarks,
                           QuestionRepository questions,
                           VocabService vocabService,
                           PracticeService practiceService) {
        this.progress = progress;
        this.bookmarks = bookmarks;
        this.questions = questions;
        this.vocabService = vocabService;
        this.practiceService = practiceService;
    }

    /** GET /api/notebook — {savedWords, bookmarks, mistakes}. */
    @Transactional(readOnly = true)
    public Map<String, Object> notebook(UUID userId) {
        List<Map<String, Object>> savedWords = new ArrayList<>();
        for (WordProgress p : progress.findByUserIdAndFavoriteTrue(userId)) {
            vocabService.toWordMap(p.getWordId(), p.getCustomWordId()).ifPresent(savedWords::add);
        }

        List<Map<String, Object>> bookmarked = new ArrayList<>();
        for (QuestionBookmark b : bookmarks.findByUserIdOrderByCreatedAtDesc(userId)) {
            questions.findById(b.getQuestionId()).ifPresent(q ->
                    bookmarked.add(practiceService.toAppQuestionMap(q, true)));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("savedWords", savedWords);
        out.put("bookmarks", bookmarked);
        out.put("mistakes", practiceService.mistakes(userId));
        return out;
    }

    /** Marks a word as favorite (saved) or removes the mark. Creates a progress row if needed. */
    @Transactional
    public void setSavedWord(UUID userId, UUID wordId, UUID customWordId, boolean saved) {
        WordProgress p = findOrCreate(userId, wordId, customWordId);
        p.setFavorite(saved);
        progress.save(p);
    }

    /** Adds a question bookmark (idempotent). */
    @Transactional
    public void addBookmark(UUID userId, UUID questionId) {
        if (!questions.existsById(questionId)) {
            throw ApiException.notFound("Không tìm thấy câu hỏi.");
        }
        if (bookmarks.findByUserIdAndQuestionId(userId, questionId).isEmpty()) {
            QuestionBookmark b = new QuestionBookmark();
            b.setUserId(userId);
            b.setQuestionId(questionId);
            bookmarks.save(b);
        }
    }

    /** Removes a question bookmark (idempotent). */
    @Transactional
    public void removeBookmark(UUID userId, UUID questionId) {
        bookmarks.deleteByUserIdAndQuestionId(userId, questionId);
    }

    private WordProgress findOrCreate(UUID userId, UUID wordId, UUID customWordId) {
        if (wordId == null && customWordId == null) {
            throw ApiException.badRequest("Thiếu wordId hoặc customWordId.");
        }
        if (wordId != null) {
            return progress.findByUserIdAndWordId(userId, wordId).orElseGet(() -> {
                WordProgress p = new WordProgress();
                p.setUserId(userId);
                p.setWordId(wordId);
                return p;
            });
        }
        return progress.findByUserIdAndCustomWordId(userId, customWordId).orElseGet(() -> {
            WordProgress p = new WordProgress();
            p.setUserId(userId);
            p.setCustomWordId(customWordId);
            return p;
        });
    }
}
