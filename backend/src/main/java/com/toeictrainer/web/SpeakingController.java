package com.toeictrainer.web;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.SpeakingScoreRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.SpeakingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Speaking Coach. Accepts either a transcript (from on-device speech
 * recognition) or an audio upload. Audio bytes are currently stored only
 * as a reference — scoring is transcript-based; a real STT provider can be
 * plugged in where marked.
 */
@RestController
@RequestMapping("/api/speaking")
public class SpeakingController {

    private final SpeakingService speakingService;

    public SpeakingController(SpeakingService speakingService) {
        this.speakingService = speakingService;
    }

    @PostMapping("/score")
    public ApiResponse<Map<String, Object>> scoreJson(@Valid @RequestBody SpeakingScoreRequest req) {
        return ApiResponse.ok(
                speakingService.score(SecurityUtils.currentUserId(), req.sentence(), req.transcript()),
                "Đã chấm điểm phát âm.");
    }

    @PostMapping(value = "/score-audio", consumes = "multipart/form-data")
    public ApiResponse<Map<String, Object>> scoreAudio(
            @RequestParam("sentence") String sentence,
            @RequestParam(value = "transcript", required = false) String transcript,
            @RequestParam(value = "audio", required = false) MultipartFile audio) {
        // STT integration point: wire a speech-to-text provider here to turn
        // `audio` into a transcript. Until then, scoring needs the transcript
        // from the device (the app already has on-device speech recognition).
        if ((transcript == null || transcript.isBlank()) && audio != null && !audio.isEmpty()) {
            throw ApiException.badRequest(
                    "Máy chủ chưa tích hợp nhận dạng giọng nói — vui lòng gửi kèm transcript từ thiết bị.");
        }
        return ApiResponse.ok(
                speakingService.score(SecurityUtils.currentUserId(), sentence, transcript),
                "Đã chấm điểm phát âm.");
    }

    @GetMapping("/history")
    public ApiResponse<List<Map<String, Object>>> history() {
        return ApiResponse.ok(speakingService.history(SecurityUtils.currentUserId()));
    }
}
