package com.toeictrainer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.PracticeAttempt;
import com.toeictrainer.domain.Question;
import com.toeictrainer.dto.PracticeAnswer;
import com.toeictrainer.dto.PracticeSubmitRequest;
import com.toeictrainer.repo.PracticeAttemptRepository;
import com.toeictrainer.repo.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Part 1-7 questions, attempt scoring, and the mistake notebook. */
@Service
public class PracticeService {

    private final QuestionRepository questions;
    private final PracticeAttemptRepository attempts;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;

    public PracticeService(QuestionRepository questions,
                           PracticeAttemptRepository attempts,
                           StatsService statsService,
                           ObjectMapper objectMapper) {
        this.questions = questions;
        this.attempts = attempts;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuestions(Integer part, int limit) {
        limit = Math.min(Math.max(limit, 1), 50);
        List<Question> list = part == null
                ? questions.findRandomByMode("practice", limit)
                : questions.findRandomByPartAndMode(part, "practice", limit);
        return list.stream().map(this::toQuestionMap).toList();
    }

    @Transactional
    public Map<String, Object> submitAttempt(UUID userId, PracticeSubmitRequest req) {
        List<PracticeAnswer> answers = req.answers() == null ? List.of() : req.answers();
        if (!List.of("practice", "mini", "half", "full", "handsfree").contains(req.mode())) {
            throw ApiException.badRequest("Chế độ làm bài không hợp lệ.");
        }
        int score = 0;
        List<Map<String, Object>> detail = new ArrayList<>();

        for (PracticeAnswer a : answers) {
            Question q = questions.findById(a.questionId())
                    .orElseThrow(() -> ApiException.badRequest("Câu hỏi không tồn tại."));
            int correctIndex = readAnswerIndex(q.getQuestionJson());
            boolean correct = a.selectedIndex() != null && a.selectedIndex() == correctIndex;
            if (correct) {
                score++;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("questionId", q.getId().toString());
            row.put("selectedIndex", a.selectedIndex());
            row.put("correctIndex", correctIndex);
            row.put("correct", correct);
            detail.add(row);
        }

        PracticeAttempt attempt = new PracticeAttempt();
        attempt.setUserId(userId);
        attempt.setMode(req.mode());
        attempt.setPart(req.part());
        attempt.setScore(score);
        attempt.setTotal(answers.size());
        try {
            attempt.setDetail(objectMapper.writeValueAsString(detail));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        attempts.save(attempt);

        // XP: 10 per correct answer, +5 participation bonus
        statsService.addXp(userId, score * 10 + 5);

        List<Map<String, Object>> mistakes = new ArrayList<>();
        for (int i = 0; i < detail.size(); i++) {
            Map<String, Object> row = detail.get(i);
            if (Boolean.FALSE.equals(row.get("correct"))) {
                Question q = questions.findById(answers.get(i).questionId())
                        .orElseThrow(() -> ApiException.badRequest("Câu hỏi không tồn tại."));
                Map<String, Object> m = toQuestionMap(q);
                m.put("selectedIndex", row.get("selectedIndex"));
                mistakes.add(m);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("attemptId", attempt.getId().toString());
        out.put("score", score);
        out.put("total", answers.size());
        out.put("mistakes", mistakes);
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAttempts(UUID userId) {
        return attempts.findByUserIdOrderByCreatedAtDesc(userId).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId().toString());
            m.put("mode", a.getMode());
            m.put("part", a.getPart());
            m.put("score", a.getScore());
            m.put("total", a.getTotal());
            m.put("createdAt", a.getCreatedAt().toString());
            return m;
        }).toList();
    }

    /** Mistake notebook: every wrongly-answered question across all attempts. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> mistakes(UUID userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (PracticeAttempt a : attempts.findByUserIdOrderByCreatedAtDesc(userId)) {
            List<Map<String, Object>> detail = readDetail(a.getDetail());
            for (Map<String, Object> row : detail) {
                if (Boolean.FALSE.equals(row.get("correct"))) {
                    String qid = (String) row.get("questionId");
                    questions.findById(UUID.fromString(qid)).ifPresent(q -> {
                        Map<String, Object> m = toQuestionMap(q);
                        m.put("selectedIndex", row.get("selectedIndex"));
                        m.put("attemptId", a.getId().toString());
                        m.put("attemptedAt", a.getCreatedAt().toString());
                        out.add(m);
                    });
                }
            }
        }
        return out;
    }

    private Map<String, Object> toQuestionMap(Question q) {
        return toAppQuestionMap(q, true);
    }

    /**
     * App-facing question shape: {id, part, prompt, passage?, imageUrl?,
     * audioUrl?, options, correctIndex, explanation, topic, level}.
     * With includeAnswers=false the answer keys are stripped (mock tests).
     * Legacy keys (answer_index, audio_hint) are kept so existing consumers
     * keep working.
     */
    public Map<String, Object> toAppQuestionMap(Question q, boolean includeAnswers) {
        Map<String, Object> body = readJson(q.getQuestionJson());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId().toString());
        m.put("part", q.getPart());
        m.put("mode", q.getMode());
        m.put("topic", q.getTopic() == null ? "" : q.getTopic());
        m.put("level", q.getLevel() == null ? "" : q.getLevel());
        for (Map.Entry<String, Object> e : body.entrySet()) {
            String key = e.getKey();
            if (!includeAnswers && ("answer_index".equals(key) || "explanation".equals(key))) {
                continue;
            }
            m.put(key, e.getValue());
        }
        Object answerIndex = body.get("answer_index");
        if (includeAnswers && answerIndex instanceof Number n) {
            m.put("correctIndex", n.intValue());
        }
        Object audioHint = body.get("audio_hint");
        if (audioHint != null) {
            m.put("audioUrl", audioHint);
        }
        Object imageUrl = body.get("image_url");
        if (imageUrl != null) {
            m.put("imageUrl", imageUrl);
        }
        return m;
    }

    /** Full app-shaped question map by id (for the notebook). */
    @Transactional(readOnly = true)
    public Map<String, Object> questionMap(UUID id) {
        Question q = questions.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi."));
        return toAppQuestionMap(q, true);
    }

    /** correctIndex for grading, package-visible for MockTestService. */
    int answerIndex(Question q) {
        return readAnswerIndex(q.getQuestionJson());
    }

    private int readAnswerIndex(String json) {
        Object v = readJson(json).get("answer_index");
        if (v instanceof Number n) {
            return n.intValue();
        }
        throw ApiException.serviceUnavailable("Dữ liệu câu hỏi bị lỗi.");
    }

    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw ApiException.serviceUnavailable("Dữ liệu câu hỏi bị lỗi.");
        }
    }

    private List<Map<String, Object>> readDetail(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
