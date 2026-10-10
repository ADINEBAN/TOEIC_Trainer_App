package com.toeictrainer.web;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.service.TtsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Speechify proxy. Streams cached or freshly-synthesized MP3.
 * When Speechify is unavailable the app must fall back to the device voice —
 * the JSON error body carries fallback:true so the client can detect it.
 */
@RestController
@RequestMapping("/api/tts")
public class TtsController {

    private final TtsService ttsService;

    public TtsController(TtsService ttsService) {
        this.ttsService = ttsService;
    }

    @GetMapping
    public ResponseEntity<?> synthesize(
            @RequestParam String text,
            @RequestParam(defaultValue = "george") String voice) {
        try {
            TtsService.TtsAudio audio = ttsService.synthesize(text, voice);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, "audio/mpeg")
                    .header("X-TTS-Cache", audio.fromCache() ? "HIT" : "MISS")
                    .header("X-TTS-Chars", String.valueOf(audio.chars()))
                    .body(audio.mp3());
        } catch (ApiException e) {
            if (e.getStatus() == HttpStatus.SERVICE_UNAVAILABLE) {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("success", false);
                body.put("data", null);
                body.put("message", e.getMessage());
                body.put("fallback", true);
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body);
            }
            throw e;
        }
    }
}
