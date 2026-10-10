package com.toeictrainer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.AiUsageLog;
import com.toeictrainer.dto.AiProxyResult;
import com.toeictrainer.repo.AiUsageLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.core.io.ByteArrayResource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Single gateway for all OpenAI-compatible chat calls.
 * Enforces the per-user daily character limit and logs every call
 * (user, feature, input/output length) for cost control.
 */
@Service
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AiUsageLogRepository usageLog;
    private final String apiKey;
    private final String apiBase;
    private final String defaultModel;
    private final String transcribeModel;
    private final long dailyCharLimit;

    public AiClient(RestClient restClient,
                    ObjectMapper objectMapper,
                    AiUsageLogRepository usageLog,
                    @Value("${app.ai.api-key:}") String apiKey,
                    @Value("${app.ai.api-base}") String apiBase,
                    @Value("${app.ai.model}") String defaultModel,
                    @Value("${app.ai.transcribe-model:whisper-1}") String transcribeModel,
                    @Value("${app.ai.daily-char-limit}") long dailyCharLimit) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.usageLog = usageLog;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiBase = apiBase.endsWith("/") ? apiBase.substring(0, apiBase.length() - 1) : apiBase;
        this.defaultModel = defaultModel;
        this.transcribeModel = transcribeModel == null || transcribeModel.isBlank()
                ? "whisper-1" : transcribeModel.trim();
        this.dailyCharLimit = dailyCharLimit;
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public String getDefaultModel() {
        return defaultModel;
    }

    /**
     * OpenAI-compatible speech-to-text: POST {apiBase}/audio/transcriptions.
     * Returns empty when no AI key is configured or the provider call fails —
     * callers must fall back honestly instead of failing the request.
     */
    public Optional<String> transcribe(byte[] audioBytes, String filename, String contentType) {
        if (!isConfigured() || audioBytes == null || audioBytes.length == 0) {
            return Optional.empty();
        }
        try {
            MultipartBodyBuilder body = new MultipartBodyBuilder();
            ByteArrayResource audio = new ByteArrayResource(audioBytes) {
                @Override
                public String getFilename() {
                    return filename == null || filename.isBlank() ? "audio.m4a" : filename;
                }
            };
            body.part("file", audio,
                    MediaType.parseMediaType(
                            contentType != null && !contentType.isBlank() ? contentType : "audio/m4a"));
            body.part("model", transcribeModel);
            String raw = restClient.post()
                    .uri(apiBase + "/audio/transcriptions")
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body.build())
                    .retrieve()
                    .body(String.class);
            String text = objectMapper.readTree(raw).path("text").asText("").trim();
            return text.isEmpty() ? Optional.empty() : Optional.of(text);
        } catch (Exception e) {
            log.warn("AI transcription failed; caller should use honest fallback", e);
            return Optional.empty();
        }
    }

    /**
     * Calls POST {apiBase}/chat/completions. Throws 503 with an honest message
     * when no key is configured; 429 when the user's daily char budget is spent.
     */
    public AiProxyResult chat(UUID userId, String feature, List<Map<String, Object>> messages) {
        return chat(userId, feature, messages, defaultModel, 0.3);
    }

    public AiProxyResult chat(UUID userId, String feature,
                              List<Map<String, Object>> messages,
                              String model, double temperature) {
        if (!isConfigured()) {
            throw ApiException.serviceUnavailable(
                    "Tính năng AI chưa được cấu hình trên máy chủ. Vui lòng thử lại sau.");
        }
        int estimatedInput = estimateChars(messages);
        long usedToday = usageLog.sumCharsSince(userId, Instant.now().truncatedTo(ChronoUnit.DAYS));
        if (usedToday + estimatedInput > dailyCharLimit) {
            throw ApiException.tooManyRequests(
                    "Bạn đã dùng hết hạn mức AI trong hôm nay. Vui lòng quay lại vào ngày mai.");
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", temperature,
                "messages", messages);
        String raw;
        try {
            raw = restClient.post()
                    .uri(apiBase + "/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.error("AI provider call failed (feature={})", feature, e);
            throw ApiException.serviceUnavailable(
                    "Nhà cung cấp AI đang gặp sự cố. Vui lòng thử lại sau.");
        }

        String content = extractContent(raw);
        AiUsageLog entry = new AiUsageLog();
        entry.setUserId(userId);
        entry.setFeature(feature);
        entry.setInputChars(estimatedInput);
        entry.setOutputChars(content.length());
        usageLog.save(entry);
        log.info("AI call: user={} feature={} in={} out={}", userId, feature, estimatedInput, content.length());
        return new AiProxyResult(content, estimatedInput, content.length());
    }

    private String extractContent(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                throw ApiException.serviceUnavailable("AI trả về kết quả trống. Vui lòng thử lại.");
            }
            return content.asText();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse AI response", e);
            throw ApiException.serviceUnavailable("Không đọc được kết quả từ AI. Vui lòng thử lại.");
        }
    }

    private static int estimateChars(List<Map<String, Object>> messages) {
        int total = 0;
        for (Map<String, Object> m : messages) {
            Object c = m.get("content");
            if (c instanceof String s) {
                total += s.length();
            } else if (c instanceof List<?> parts) {
                for (Object p : parts) {
                    if (p instanceof Map<?, ?> pm) {
                        Object t = pm.get("text");
                        if (t instanceof String s) {
                            total += s.length();
                        }
                    }
                }
            }
        }
        return total;
    }

    /** Strips ```json ... ``` fences so the model output parses as JSON. */
    public static String extractJson(String text) {
        if (text == null) {
            return "{}";
        }
        String t = text.trim();
        if (t.startsWith("```")) {
            int firstNewline = t.indexOf('\n');
            int lastFence = t.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                t = t.substring(firstNewline + 1, lastFence).trim();
            }
        }
        int start = Math.min(indexOfAny(t, '{', '['), t.length());
        int end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
        if (start < end) {
            return t.substring(start, end + 1);
        }
        return t;
    }

    private static int indexOfAny(String t, char a, char b) {
        int i = t.indexOf(a);
        int j = t.indexOf(b);
        if (i < 0) return j;
        if (j < 0) return i;
        return Math.min(i, j);
    }
}
