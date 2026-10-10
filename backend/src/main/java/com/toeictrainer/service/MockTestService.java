package com.toeictrainer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.PracticeAttempt;
import com.toeictrainer.domain.Question;
import com.toeictrainer.domain.TestSession;
import com.toeictrainer.dto.TestAnswer;
import com.toeictrainer.repo.PracticeAttemptRepository;
import com.toeictrainer.repo.QuestionRepository;
import com.toeictrainer.repo.TestSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Mini/Half/Full mock tests. Questions are served WITHOUT answers;
 * grading scales each section's correct ratio to /495 (total /990).
 * A submitted test is also recorded as a practice_attempt so its mistakes
 * show up in the notebook.
 */
@Service
public class MockTestService {

    private final TestSessionRepository sessions;
    private final QuestionRepository questions;
    private final PracticeAttemptRepository attempts;
    private final PracticeService practiceService;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;

    public MockTestService(TestSessionRepository sessions,
                           QuestionRepository questions,
                           PracticeAttemptRepository attempts,
                           PracticeService practiceService,
                           StatsService statsService,
                           ObjectMapper objectMapper) {
        this.sessions = sessions;
        this.questions = questions;
        this.attempts = attempts;
        this.practiceService = practiceService;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    /** POST /api/tests/start — samples questions, hides answers. */
    @Transactional
    public Map<String, Object> start(UUID userId, String kind) {
        String k = kind == null ? "" : kind.trim().toUpperCase();
        int count = switch (k) {
            case "MINI" -> 10;
            case "HALF" -> 20;
            case "FULL" -> 40;
            default -> throw ApiException.badRequest("kind phải là MINI|HALF|FULL.");
        };
        int durationMinutes = switch (k) {
            case "MINI" -> 20;
            case "HALF" -> 60;
            default -> 120;
        };

        // Prefer a dedicated 'mock' bank; fall back to the practice bank.
        List<Question> bank = questions.findRandomByMode("mock", count);
        if (bank.isEmpty()) {
            bank = questions.findRandomByMode("practice", count);
        }
        if (bank.isEmpty()) {
            throw ApiException.serviceUnavailable("Ngân hàng câu hỏi đang trống. Vui lòng thử lại sau.");
        }

        TestSession s = new TestSession();
        s.setUserId(userId);
        s.setKind(k);
        try {
            s.setQuestionIds(objectMapper.writeValueAsString(
                    bank.stream().map(q -> q.getId().toString()).toList()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        sessions.save(s);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("testId", s.getId().toString());
        out.put("kind", k);
        out.put("questions", bank.stream().map(q -> practiceService.toAppQuestionMap(q, false)).toList());
        out.put("durationMinutes", durationMinutes);
        out.put("note", bank.size() < count
                ? "Ngân hàng hiện chỉ có " + bank.size() + " câu nên bài thi dùng toàn bộ số câu có sẵn."
                : null);
        return out;
    }

    /** GET /api/tests/{id}/questions — the same question set, still without answers. */
    @Transactional(readOnly = true)
    public Map<String, Object> testQuestions(UUID userId, UUID testId) {
        TestSession s = load(userId, testId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("testId", s.getId().toString());
        out.put("kind", s.getKind());
        out.put("questions", sessionQuestions(s).stream()
                .map(q -> practiceService.toAppQuestionMap(q, false)).toList());
        out.put("durationMinutes", durationMinutes(s.getKind()));
        out.put("submitted", s.isSubmitted());
        return out;
    }

    /** POST /api/tests/{id}/submit — grades, persists, and returns the full TestResult. */
    @Transactional
    public Map<String, Object> submit(UUID userId, UUID testId, List<TestAnswer> answers) {
        TestSession s = load(userId, testId);
        if (s.isSubmitted()) {
            return storedResult(s);
        }
        List<TestAnswer> list = answers == null ? List.of() : answers;
        Map<UUID, Integer> byQuestion = new LinkedHashMap<>();
        for (TestAnswer a : list) {
            if (a.questionId() != null) {
                byQuestion.put(a.questionId(), a.selected());
            }
        }

        List<Question> bank = sessionQuestions(s);
        int listenCorrect = 0, listenTotal = 0, readCorrect = 0, readTotal = 0;
        List<Map<String, Object>> perPart = new ArrayList<>();
        List<Map<String, Object>> mistakes = new ArrayList<>();
        List<Map<String, Object>> detail = new ArrayList<>();
        int[] partCorrect = new int[8];
        int[] partTotal = new int[8];

        for (Question q : bank) {
            Integer selected = byQuestion.get(q.getId());
            int correctIndex = practiceService.answerIndex(q);
            boolean correct = selected != null && selected == correctIndex;
            partTotal[q.getPart()]++;
            if (correct) {
                partCorrect[q.getPart()]++;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("questionId", q.getId().toString());
            row.put("selectedIndex", selected);
            row.put("correctIndex", correctIndex);
            row.put("correct", correct);
            detail.add(row);

            if (q.getPart() <= 4) {
                listenTotal++;
                if (correct) {
                    listenCorrect++;
                }
            } else {
                readTotal++;
                if (correct) {
                    readCorrect++;
                }
            }
            if (!correct) {
                Map<String, Object> m = practiceService.toAppQuestionMap(q, true);
                m.put("selectedIndex", selected);
                mistakes.add(m);
            }
        }
        for (int part = 1; part <= 7; part++) {
            if (partTotal[part] > 0) {
                perPart.add(Map.of("part", part, "correct", partCorrect[part], "total", partTotal[part]));
            }
        }

        int listeningScore = scale(listenCorrect, listenTotal);
        int readingScore = scale(readCorrect, readTotal);

        s.setSubmitted(true);
        s.setListeningScore(listeningScore);
        s.setReadingScore(readingScore);
        s.setTotalScore(listeningScore + readingScore);
        try {
            s.setAnswers(objectMapper.writeValueAsString(detail));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        sessions.save(s);

        // Mirror into practice_attempts so the mistakes surface in the notebook.
        PracticeAttempt attempt = new PracticeAttempt();
        attempt.setUserId(userId);
        attempt.setMode(s.getKind().toLowerCase()); // mini|half|full
        attempt.setScore(listenCorrect + readCorrect);
        attempt.setTotal(bank.size());
        try {
            attempt.setDetail(objectMapper.writeValueAsString(detail));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        attempts.save(attempt);

        statsService.addXp(userId, (listenCorrect + readCorrect) * 10 + 20);

        return storedResult(s);
    }

    /** GET /api/tests/{id}/result — the stored, graded result. */
    @Transactional(readOnly = true)
    public Map<String, Object> result(UUID userId, UUID testId) {
        TestSession s = load(userId, testId);
        if (!s.isSubmitted()) {
            throw ApiException.notFound("Bài thi chưa được nộp.");
        }
        return storedResult(s);
    }

    // ------------------------------------------------------------------
    private TestSession load(UUID userId, UUID testId) {
        return sessions.findByIdAndUserId(testId, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài thi."));
    }

    private List<Question> sessionQuestions(TestSession s) {
        List<String> ids = readIds(s.getQuestionIds());
        List<Question> out = new ArrayList<>();
        for (String id : ids) {
            questions.findById(UUID.fromString(id)).ifPresent(out::add);
        }
        return out;
    }

    private Map<String, Object> storedResult(TestSession s) {
        List<Question> bank = sessionQuestions(s);
        List<Map<String, Object>> mistakes = new ArrayList<>();
        List<Map<String, Object>> detail = readDetail(s.getAnswers());
        Map<String, Map<String, Object>> byId = new LinkedHashMap<>();
        for (Map<String, Object> row : detail) {
            byId.put(String.valueOf(row.get("questionId")), row);
        }
        int correctCount = 0;
        for (Question q : bank) {
            Map<String, Object> row = byId.get(q.getId().toString());
            boolean correct = row != null && Boolean.TRUE.equals(row.get("correct"));
            if (correct) {
                correctCount++;
            } else {
                Map<String, Object> m = practiceService.toAppQuestionMap(q, true);
                m.put("selectedIndex", row == null ? null : row.get("selectedIndex"));
                mistakes.add(m);
            }
        }
        List<Map<String, Object>> perPart = new ArrayList<>();
        for (int part = 1; part <= 7; part++) {
            int c = 0, t = 0;
            for (Question q : bank) {
                if (q.getPart() == part) {
                    t++;
                    Map<String, Object> row = byId.get(q.getId().toString());
                    if (row != null && Boolean.TRUE.equals(row.get("correct"))) {
                        c++;
                    }
                }
            }
            if (t > 0) {
                perPart.add(Map.of("part", part, "correct", c, "total", t));
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("testId", s.getId().toString());
        out.put("kind", s.getKind());
        out.put("listeningScore", s.getListeningScore() == null ? 0 : s.getListeningScore());
        out.put("readingScore", s.getReadingScore() == null ? 0 : s.getReadingScore());
        out.put("totalScore", s.getTotalScore() == null ? 0 : s.getTotalScore());
        out.put("correctCount", correctCount);
        out.put("totalCount", bank.size());
        out.put("perPart", perPart);
        out.put("mistakes", mistakes);
        return out;
    }

    /** Scales a section's correct ratio to /495, rounded. */
    private static int scale(int correct, int total) {
        if (total == 0) {
            return 0;
        }
        return (int) Math.round((double) correct / total * 495);
    }

    private static int durationMinutes(String kind) {
        return switch (kind) {
            case "MINI" -> 20;
            case "HALF" -> 60;
            default -> 120;
        };
    }

    private List<String> readIds(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            return List.of();
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
