package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.Vocabulary;
import com.toeictrainer.repo.VocabularyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Speaking samples, multipart audio scoring, and hands-free voice learning.
 * Transcription is best-effort: when the AI key is missing or the provider
 * fails, results are honestly marked as fallback instead of invented.
 */
@Service
public class SpeakingFeatureService {

    private static final Logger log = LoggerFactory.getLogger(SpeakingFeatureService.class);

    /** Sample sentences for the Speaking Coach — clearly static sample data. */
    private static final List<Map<String, Object>> SAMPLES = List.of(
            sample("sample-1", "Good morning, everyone. Thank you for coming to the meeting.", "beginner"),
            sample("sample-2", "Could you please send me the report by Friday afternoon?", "beginner"),
            sample("sample-3", "The quarterly sales figures exceeded our expectations this year.", "intermediate"),
            sample("sample-4", "I would like to schedule a follow-up call to discuss the contract.", "intermediate"),
            sample("sample-5", "Our new marketing campaign targets young professionals in urban areas.", "intermediate"),
            sample("sample-6", "Please confirm your attendance at the training session next Monday.", "intermediate"),
            sample("sample-7", "The implementation of the new policy has significantly improved efficiency.", "advanced"),
            sample("sample-8", "We need to negotiate more favorable terms with our overseas suppliers.", "advanced"),
            sample("sample-9", "Despite the economic uncertainty, the company remains committed to expansion.", "advanced"),
            sample("sample-10", "The comprehensive audit revealed several discrepancies in the financial statements.", "advanced"));

    private static Map<String, Object> sample(String id, String text, String level) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("text", text);
        m.put("level", level);
        m.put("sample", true); // static sample data, not user content
        return m;
    }

    private final SpeakingService speakingService;
    private final AiClient ai;
    private final VocabularyRepository vocabulary;
    private final String storageDir;

    /** In-memory hands-free sessions: sessionId -> items (expires after 1h). */
    private final Map<String, HandsfreeSessionData> sessions = new ConcurrentHashMap<>();

    private record HandsfreeSessionData(Instant createdAt, List<Map<String, Object>> items) {
    }

    public SpeakingFeatureService(SpeakingService speakingService,
                                  AiClient ai,
                                  VocabularyRepository vocabulary,
                                  @Value("${app.storage-dir}") String storageDir) {
        this.speakingService = speakingService;
        this.ai = ai;
        this.vocabulary = vocabulary;
        this.storageDir = storageDir;
    }

    // ------------------------------------------------------------------
    // Samples
    // ------------------------------------------------------------------
    public List<Map<String, Object>> samples() {
        return SAMPLES;
    }

    private String sampleText(String sampleId) {
        return SAMPLES.stream()
                .filter(s -> sampleId.equals(s.get("id")))
                .map(s -> (String) s.get("text"))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu mẫu."));
    }

    // ------------------------------------------------------------------
    // Multipart audio scoring (app contract: SpeakingResult)
    // ------------------------------------------------------------------
    @Transactional
    public Map<String, Object> scoreAudio(UUID userId, String sampleId,
                                          byte[] audioBytes, String filename, String contentType) {
        if (sampleId == null || sampleId.isBlank()) {
            throw ApiException.badRequest("Thiếu sampleId của câu mẫu.");
        }
        if (audioBytes == null || audioBytes.length == 0) {
            throw ApiException.badRequest("File audio trống.");
        }
        if (audioBytes.length > 10 * 1024 * 1024) {
            throw ApiException.badRequest("File audio quá lớn (tối đa 10MB).");
        }
        String text = sampleText(sampleId.trim());
        storeAudio(userId, audioBytes, filename);

        // Best-effort transcription; empty means "honest fallback" downstream.
        String transcript = ai.transcribe(audioBytes, filename, contentType).orElse(null);
        if (transcript == null) {
            log.info("No AI transcription available for user {}; using fallback scoring", userId);
        }

        Map<String, Object> scored = speakingService.score(userId, text, transcript);
        return toSpeakingResult(scored, transcript);
    }

    /** Existing speaking history, mapped to the app contract. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> historyForApp(UUID userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> a : speakingService.history(userId)) {
            Map<String, Object> scores = withOverall(asMap(a.get("scores")));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.get("id"));
            m.put("sampleText", a.get("sentence"));
            m.put("transcript", a.get("transcript"));
            m.put("scores", scores);
            m.put("weakSounds", a.get("weakPoints"));
            m.put("feedback", a.get("feedback"));
            m.put("fallback", a.get("fallback"));
            m.put("createdAt", a.get("createdAt"));
            out.add(m);
        }
        return out;
    }

    /** Maps the internal score() result to the app's SpeakingResult contract. */
    private Map<String, Object> toSpeakingResult(Map<String, Object> scored, String transcript) {
        Map<String, Object> scores = withOverall(asMap(scored.get("scores")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("scores", scores);
        out.put("transcript", transcript == null ? "" : transcript);
        out.put("weakSounds", scored.getOrDefault("weakPoints", List.of()));
        out.put("feedback", scored.getOrDefault("feedback", ""));
        out.put("attemptId", scored.get("attemptId"));
        out.put("fallback", scored.getOrDefault("fallback", true));
        return out;
    }

    private Map<String, Object> withOverall(Map<String, Object> scores) {
        Map<String, Object> m = new LinkedHashMap<>(scores);
        double sum = 0;
        int n = 0;
        for (String k : List.of("pronunciation", "fluency", "accuracy", "intonation")) {
            Object v = m.get(k);
            if (v instanceof Number num) {
                sum += num.doubleValue();
                n++;
            }
        }
        m.put("overall", n == 0 ? 0 : Math.round((sum / n) * 10.0) / 10.0);
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : Map.of();
    }

    private void storeAudio(UUID userId, byte[] bytes, String filename) {
        try {
            Path dir = Paths.get(storageDir, "speaking", userId.toString());
            Files.createDirectories(dir);
            String safe = (filename == null || filename.isBlank() ? "audio.m4a" : filename)
                    .replaceAll("[^a-zA-Z0-9._-]", "_");
            Files.write(dir.resolve(UUID.randomUUID() + "_" + safe), bytes);
        } catch (IOException e) {
            log.error("Failed to store speaking audio", e);
            throw ApiException.serviceUnavailable("Không lưu được file audio. Vui lòng thử lại.");
        }
    }

    // ------------------------------------------------------------------
    // Hands-free voice learning
    // ------------------------------------------------------------------
    /** Picks `count` random vocabulary words for a voice Q&A session. */
    public Map<String, Object> startHandsfreeSession(UUID userId, int count) {
        int n = Math.min(Math.max(count, 1), 30);
        List<Vocabulary> words = vocabulary.findRandom(n);
        if (words.isEmpty()) {
            throw ApiException.serviceUnavailable("Kho từ vựng đang trống. Vui lòng thử lại sau.");
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (Vocabulary v : words) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", UUID.randomUUID().toString());
            item.put("kind", "vocab");
            item.put("prompt", "Hãy đọc to từ tiếng Anh có nghĩa: \"" + v.getMeaningVi() + "\"");
            item.put("expectedAnswer", v.getWord());
            items.add(item);
        }
        String sessionId = UUID.randomUUID().toString();
        sessions.put(sessionId, new HandsfreeSessionData(Instant.now(), items));
        evictExpiredSessions();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sessionId", sessionId);
        out.put("items", items);
        return out;
    }

    /** Grades one voice answer: transcribe (if possible), then compare to the expected word. */
    @Transactional
    public Map<String, Object> answerHandsfree(UUID userId, String sessionId, String itemId,
                                               byte[] audioBytes, String filename, String contentType) {
        if (sessionId == null || sessionId.isBlank() || itemId == null || itemId.isBlank()) {
            throw ApiException.badRequest("Thiếu sessionId hoặc itemId.");
        }
        if (audioBytes == null || audioBytes.length == 0) {
            throw ApiException.badRequest("File audio trống.");
        }
        HandsfreeSessionData session = sessions.get(sessionId);
        if (session == null) {
            throw ApiException.notFound("Phiên luyện tập không tồn tại hoặc đã hết hạn.");
        }
        Map<String, Object> item = session.items().stream()
                .filter(i -> itemId.equals(i.get("id")))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi trong phiên này."));
        String expected = String.valueOf(item.getOrDefault("expectedAnswer", ""));

        String transcript = ai.transcribe(audioBytes, filename, contentType).orElse(null);

        Map<String, Object> out = new LinkedHashMap<>();
        if (transcript == null) {
            out.put("transcript", "");
            out.put("correct", false);
            out.put("explanation", "Chưa thể chấm câu trả lời bằng giọng nói vì máy chủ chưa cấu hình "
                    + "nhận dạng giọng nói AI (AI_API_KEY). Đáp án đúng là \"" + expected + "\".");
            return out;
        }
        boolean correct = transcript.toLowerCase().contains(expected.toLowerCase());
        out.put("transcript", transcript);
        out.put("correct", correct);
        out.put("explanation", correct
                ? "Chính xác! Bạn đã đọc đúng từ \"" + expected + "\"."
                : "Bạn đã đọc: \"" + transcript + "\". Đáp án đúng là \"" + expected + "\". Hãy thử đọc lại.");
        return out;
    }

    private void evictExpiredSessions() {
        Instant cutoff = Instant.now().minusSeconds(3600);
        sessions.entrySet().removeIf(e -> e.getValue().createdAt().isBefore(cutoff));
    }
}
