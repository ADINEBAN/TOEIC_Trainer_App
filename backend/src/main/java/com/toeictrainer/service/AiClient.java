package com.toeictrainer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.core.io.ByteArrayResource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
        return chat(userId, feature, messages, model, temperature, null);
    }

    public AiProxyResult chat(UUID userId, String feature,
                              List<Map<String, Object>> messages,
                              String model, double temperature, Integer maxOutputTokens) {
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

        Map<String, Object> body = buildGeminiRequest(model, temperature, messages, maxOutputTokens);
        String raw;
        try {
            String geminiUri = apiBase + "/models/" + model + ":generateContent?key=" + apiKey;
            raw = restClient.post()
                    .uri(geminiUri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 429 && isProviderCreditExhausted(e)) {
                log.error("AI provider credits exhausted (feature={})", feature);
                throw ApiException.serviceUnavailable(
                        "Tài khoản AI của máy chủ đã hết credit. Chủ máy cần nạp credit hoặc cập nhật AI_API_KEY có hạn mức.");
            }
            if (status == 429) {
                log.warn("AI provider rate limit reached (feature={})", feature);
                throw ApiException.tooManyRequests(
                        "Nhà cung cấp AI đang giới hạn yêu cầu. Vui lòng đợi rồi thử lại.");
            }
            if (status == 401 || status == 403) {
                log.error("AI provider rejected credentials (feature={}, status={})", feature, status);
                throw ApiException.serviceUnavailable(
                        "AI_API_KEY không hợp lệ hoặc không có quyền sử dụng dịch vụ AI.");
            }
            String providerMessage = providerErrorMessage(e);
            log.error("AI provider call failed (feature={}, status={}, message={})",
                    feature, status, providerMessage);
            if (status == 404) {
                throw ApiException.serviceUnavailable(
                        "Gemini không tìm thấy model hoặc endpoint đang cấu hình. "
                                + "Kiểm tra AI_API_BASE và AI_MODEL ở máy chủ.");
            }
            throw ApiException.serviceUnavailable(
                    "Nhà cung cấp AI đang gặp sự cố. Vui lòng thử lại sau.");
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

    private Map<String, Object> buildGeminiRequest(
            String model, double temperature, List<Map<String, Object>> messages, Integer maxOutputTokens) {
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Map<String, Object> message : messages) {
            String role = String.valueOf(message.getOrDefault("role", "user"));
            Object content = message.get("content");
            List<Map<String, Object>> parts = toGeminiParts(content);
            if (parts.isEmpty()) {
                continue;
            }

            String geminiRole = switch (role.toLowerCase(Locale.ROOT)) {
                case "assistant" -> "model";
                case "system" -> "user";
                default -> "user";
            };

            contents.add(Map.of(
                    "role", geminiRole,
                    "parts", parts));
        }

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", temperature);
        if (maxOutputTokens != null && maxOutputTokens > 0) {
            generationConfig.put("maxOutputTokens", maxOutputTokens);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("generationConfig", generationConfig);
        body.put("contents", contents);
        return body;
    }

    private List<Map<String, Object>> toGeminiParts(Object content) {
        List<Map<String, Object>> parts = new ArrayList<>();
        if (content == null) {
            return parts;
        }
        if (content instanceof String s) {
            if (!s.isBlank()) {
                parts.add(Map.of("text", s));
            }
            return parts;
        }
        if (content instanceof List<?> items) {
            for (Object item : items) {
                addGeminiPart(parts, item);
            }
            return parts;
        }
        parts.add(Map.of("text", String.valueOf(content)));
        return parts;
    }

    private void addGeminiPart(List<Map<String, Object>> parts, Object item) {
        if (!(item instanceof Map<?, ?> map)) {
            return;
        }

        Object text = map.get("text");
        if (text instanceof String textValue && !textValue.isBlank()) {
            parts.add(Map.of("text", textValue));
        }

        Object imageUrlValue = map.get("image_url");
        if (!(imageUrlValue instanceof Map<?, ?> imageUrlMap)) {
            return;
        }
        Object urlValue = imageUrlMap.get("url");
        if (!(urlValue instanceof String dataUrl) || !dataUrl.startsWith("data:")) {
            return;
        }

        int mimeEnd = dataUrl.indexOf(';');
        int dataStart = dataUrl.indexOf(";base64,");
        if (mimeEnd < 6 || dataStart < mimeEnd) {
            return;
        }

        String mimeType = dataUrl.substring(5, mimeEnd);
        String encodedData = dataUrl.substring(dataStart + ";base64,".length());
        if (mimeType.isBlank() || encodedData.isBlank()) {
            return;
        }

        parts.add(Map.of("inlineData", Map.of(
                "mimeType", mimeType,
                "data", encodedData)));
    }

    private boolean isProviderCreditExhausted(HttpClientErrorException exception) {
        String responseBody = exception.getResponseBodyAsString();
        try {
            JsonNode error = objectMapper.readTree(responseBody).path("error");
            return "insufficient_quota".equals(error.path("type").asText())
                    || "credit_balance_exhausted".equals(error.path("code").asText());
        } catch (JsonProcessingException ignored) {
            return responseBody.contains("insufficient_quota")
                    || responseBody.contains("credit_balance_exhausted");
        }
    }

    private String providerErrorMessage(HttpClientErrorException exception) {
        try {
            String message = objectMapper.readTree(exception.getResponseBodyAsString())
                    .path("error")
                    .path("message")
                    .asText("");
            if (message.isBlank()) {
                return "no provider message";
            }
            return message.replace(apiKey, "[redacted]").substring(0, Math.min(message.length(), 500));
        } catch (JsonProcessingException ignored) {
            return "provider error body was not valid JSON";
        }
    }

    private String extractContent(String raw) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.path(0).path("content").path("parts");
                if (parts.isArray()) {
                    StringBuilder combined = new StringBuilder();
                    for (JsonNode part : parts) {
                        if (part.has("text")) {
                            combined.append(part.path("text").asText());
                        }
                    }
                    if (combined.length() > 0) {
                        return combined.toString();
                    }
                }
            }

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
