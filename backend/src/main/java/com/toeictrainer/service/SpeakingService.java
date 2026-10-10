package com.toeictrainer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.SpeakingAttempt;
import com.toeictrainer.dto.AiProxyResult;
import com.toeictrainer.repo.SpeakingAttemptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Speaking Coach scoring.
 * The app sends the target sentence + the transcript from on-device speech
 * recognition (the backend does not do STT itself). With an AI key the
 * transcript is scored by AI; without one, an honest transcript-based
 * heuristic is returned and marked as fallback.
 */
@Service
public class SpeakingService {

    private final SpeakingAttemptRepository attempts;
    private final AiClient ai;
    private final StatsService statsService;
    private final ObjectMapper objectMapper;

    public SpeakingService(SpeakingAttemptRepository attempts,
                           AiClient ai,
                           StatsService statsService,
                           ObjectMapper objectMapper) {
        this.attempts = attempts;
        this.ai = ai;
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> score(UUID userId, String sentence, String transcript) {
        if (sentence == null || sentence.isBlank()) {
            throw ApiException.badRequest("Thiếu câu mẫu cần đọc.");
        }
        Map<String, Object> result;
        boolean fallback;
        if (ai.isConfigured() && transcript != null && !transcript.isBlank()) {
            result = aiScore(sentence, transcript, userId);
            fallback = false;
        } else {
            result = fallbackScore(sentence, transcript);
            fallback = true;
        }

        SpeakingAttempt attempt = new SpeakingAttempt();
        attempt.setUserId(userId);
        attempt.setSentence(sentence);
        attempt.setTranscript(transcript);
        attempt.setFallback(fallback);
        try {
            attempt.setScores(objectMapper.writeValueAsString(result.get("scores")));
            attempt.setFeedback((String) result.get("feedback"));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        attempts.save(attempt);
        statsService.addXp(userId, 10);

        Map<String, Object> out = new LinkedHashMap<>(result);
        out.put("attemptId", attempt.getId().toString());
        out.put("fallback", fallback);
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(UUID userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (SpeakingAttempt a : attempts.findByUserIdOrderByCreatedAtDesc(userId)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId().toString());
            m.put("sentence", a.getSentence());
            m.put("transcript", a.getTranscript() == null ? "" : a.getTranscript());
            m.put("scores", readScores(a.getScores()));
            m.put("feedback", a.getFeedback() == null ? "" : a.getFeedback());
            m.put("fallback", a.isFallback());
            m.put("createdAt", a.getCreatedAt().toString());
            out.add(m);
        }
        return out;
    }

    // ------------------------------------------------------------------
    // AI scoring
    // ------------------------------------------------------------------
    private Map<String, Object> aiScore(String sentence, String transcript, UUID userId) {
        String system = "Bạn là huấn luyện viên phát âm tiếng Anh cho người Việt học TOEIC. "
                + "Chấm bản transcript của học viên so với câu mẫu. "
                + "Trả về DUY NHẤT một JSON hợp lệ, không giải thích thêm: "
                + "{\"scores\": {\"pronunciation\": 0-10, \"fluency\": 0-10, \"intonation\": 0-10, \"accuracy\": 0-10}, "
                + "\"weakPoints\": [\"điểm yếu cụ thể bằng tiếng Việt\"], "
                + "\"feedback\": \"nhận xét chi tiết bằng tiếng Việt, chỉ rõ âm cuối, trọng âm, nối âm nếu có\"}";
        String userMsg = "Câu mẫu: \"" + sentence + "\"\nBản học viên đọc (transcript): \"" + transcript + "\"";
        AiProxyResult r = ai.chat(userId, "speaking",
                List.of(Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", userMsg)));
        Map<String, Object> parsed = parseJson(AiClient.extractJson(r.content()));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scores", parsed.getOrDefault("scores", Map.of()));
        out.put("weakPoints", parsed.getOrDefault("weakPoints", List.of()));
        out.put("feedback", parsed.getOrDefault("feedback", ""));
        return out;
    }

    // ------------------------------------------------------------------
    // Honest fallback: transcript-based heuristic, clearly marked
    // ------------------------------------------------------------------
    private Map<String, Object> fallbackScore(String sentence, String transcript) {
        List<String> targetWords = words(sentence);
        List<String> saidWords = transcript == null ? List.of() : words(transcript);

        int matched = 0;
        for (String w : saidWords) {
            if (targetWords.contains(w)) {
                matched++;
            }
        }
        double ratio = targetWords.isEmpty() ? 0 : (double) matched / targetWords.size();
        int accuracy = (int) Math.round(ratio * 10);
        // Without audio we cannot judge sound — say so, and keep other
        // components close to accuracy instead of inventing detail.
        int pronunciation = Math.max(0, accuracy - 1);
        int fluency = accuracy;
        int intonation = Math.max(0, accuracy - 1);

        List<String> weakPoints = new ArrayList<>();
        if (transcript == null || transcript.isBlank()) {
            weakPoints.add("Chưa có transcript — hãy bật nhận dạng giọng nói trên thiết bị rồi đọc lại.");
        } else {
            for (String w : targetWords) {
                if (!saidWords.contains(w)) {
                    weakPoints.add("Từ \"" + w + "\" chưa được đọc đúng hoặc bị bỏ sót.");
                }
                if (weakPoints.size() >= 5) {
                    break;
                }
            }
            if (weakPoints.isEmpty()) {
                weakPoints.add("Đọc đủ từ. Hãy chú ý âm cuối và trọng âm khi luyện lại.");
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scores", Map.of(
                "pronunciation", pronunciation,
                "fluency", fluency,
                "intonation", intonation,
                "accuracy", accuracy));
        out.put("weakPoints", weakPoints);
        out.put("feedback", "Đây là điểm chấm dự phòng (không dùng AI): hệ thống chỉ so sánh "
                + "transcript với câu mẫu nên chưa đánh giá được âm thanh thật. "
                + "Bạn đọc đúng khoảng " + Math.round(ratio * 100) + "% số từ của câu mẫu. "
                + "Hãy đọc chậm, nhấn rõ âm cuối của mỗi từ rồi thử lại.");
        return out;
    }

    private static List<String> words(String s) {
        return List.of(s.toLowerCase().replaceAll("[^a-z' ]", " ").trim().split("\\s+")).stream()
                .filter(w -> !w.isBlank())
                .toList();
    }

    private Map<String, Object> parseJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw ApiException.serviceUnavailable("AI chấm điểm thất bại. Vui lòng thử lại.");
        }
    }

    private Map<String, Object> readScores(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
