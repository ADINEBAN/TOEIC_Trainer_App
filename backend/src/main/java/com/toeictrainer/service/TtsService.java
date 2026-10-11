package com.toeictrainer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.TtsCache;
import com.toeictrainer.repo.TtsCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

/**
 * Speechify proxy with a system-wide content cache.
 * One text -> one Speechify call ever; everyone after reads tts_cache.
 */
@Service
public class TtsService {

    private static final Logger log = LoggerFactory.getLogger(TtsService.class);

    public record TtsAudio(byte[] mp3, boolean fromCache, int chars) {
    }

    private final TtsCacheRepository cache;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiUrl;
    private final String model;

    public TtsService(TtsCacheRepository cache,
                      RestClient restClient,
                      ObjectMapper objectMapper,
                      @Value("${app.speechify.api-key:}") String apiKey,
                      @Value("${app.speechify.api-url}") String apiUrl,
                      @Value("${app.speechify.model}") String model) {
        this.cache = cache;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiUrl = apiUrl;
        this.model = model;
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public String getModel() {
        return model;
    }

    @Transactional
    public TtsAudio synthesize(String text, String voice) {
        String voiceId = (voice == null || voice.isBlank()) ? "george" : voice.trim();
        if (text == null || text.isBlank() || text.length() > 2000) {
            throw ApiException.badRequest("Đoạn text quá dài hoặc trống (tối đa 2000 ký tự).");
        }
        String hash = sha256(text + "|" + voiceId + "|" + model);

        Optional<TtsCache> hit = cache.findByTextHash(hash);
        if (hit.isPresent() && hit.get().getAudio() != null) {
            return new TtsAudio(hit.get().getAudio(), true, hit.get().getChars());
        }

        if (!isConfigured()) {
            throw ApiException.serviceUnavailable(
                    "Giọng đọc George chưa được cấu hình trên máy chủ. Vui lòng dùng giọng đọc của thiết bị.");
        }

        byte[] mp3 = callSpeechify(text, voiceId);

        TtsCache entry = hit.orElseGet(TtsCache::new);
        entry.setTextHash(hash);
        entry.setText(text);
        entry.setVoice(voiceId);
        entry.setModel(model);
        entry.setAudio(mp3);
        entry.setChars(text.length());
        cache.save(entry);

        log.info("TTS synthesized: voice={} chars={} bytes={}", voiceId, text.length(), mp3.length);
        return new TtsAudio(mp3, false, text.length());
    }

    private byte[] callSpeechify(String text, String voiceId) {
        Map<String, Object> body = Map.of(
                "input", text,
                "voice_id", voiceId,
                "audio_format", "mp3",
                "model", model);
        try {
            String response = restClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode payload = objectMapper.readTree(response);
            String encodedAudio = payload.path("audio_data").asText("");
            if (encodedAudio.isBlank()) {
                throw ApiException.serviceUnavailable(
                        "Speechify không trả về dữ liệu âm thanh. Vui lòng kiểm tra API key và cấu hình giọng đọc.");
            }
            byte[] audio = Base64.getDecoder().decode(encodedAudio);
            if (audio.length == 0) {
                throw ApiException.serviceUnavailable(
                        "Speechify trả về âm thanh trống. Vui lòng thử lại sau.");
            }
            return audio;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Speechify call failed", e);
            throw ApiException.serviceUnavailable(
                    "Không tạo được giọng đọc lúc này. Vui lòng dùng giọng đọc của thiết bị.");
        }
    }

    static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
