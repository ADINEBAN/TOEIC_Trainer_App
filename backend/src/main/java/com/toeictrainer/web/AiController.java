package com.toeictrainer.web;

import com.toeictrainer.common.ApiResponse;
import com.toeictrainer.dto.SemanticRequest;
import com.toeictrainer.dto.TutorRequest;
import com.toeictrainer.security.SecurityUtils;
import com.toeictrainer.service.AiService;
import com.toeictrainer.service.SpeakingFeatureService;
import com.toeictrainer.service.TtsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** AI features proxy — all keys stay on the server. */
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final SpeakingFeatureService speakingFeatureService;
    private final TtsService ttsService;

    public AiController(AiService aiService,
                        SpeakingFeatureService speakingFeatureService,
                        TtsService ttsService) {
        this.aiService = aiService;
        this.speakingFeatureService = speakingFeatureService;
        this.ttsService = ttsService;
    }

    /** Which AI-backed features are usable on this server. */
    @GetMapping("/availability")
    public ApiResponse<Map<String, Object>> availability() {
        return ApiResponse.ok(aiService.availability(ttsService.isConfigured()));
    }

    /** 6.1 Semantic word network (DB cache first, AI once). */
    @PostMapping("/semantic")
    public ApiResponse<Map<String, Object>> semantic(@Valid @RequestBody SemanticRequest req) {
        return ApiResponse.ok(aiService.semanticNetwork(SecurityUtils.currentUserId(), req.word()));
    }

    /** GET alias of the semantic network (same logic, POST kept). */
    @GetMapping("/semantic")
    public ApiResponse<Map<String, Object>> semanticGet(@RequestParam("word") String word) {
        return ApiResponse.ok(aiService.semanticNetwork(SecurityUtils.currentUserId(), word));
    }

    /** Saves a semantic-network word into the user's own word list. */
    @PostMapping("/semantic/save")
    public ApiResponse<Map<String, String>> saveSemanticWord(@RequestBody Map<String, String> body) {
        Map<String, Object> saved = aiService.saveSemanticWord(
                SecurityUtils.currentUserId(), body == null ? null : body.get("word"));
        return ApiResponse.ok(Map.of("id", String.valueOf(saved.get("id"))), "Đã lưu từ vào danh sách của bạn.");
    }

    /** 6.2 Camera photo-to-word. */
    @PostMapping(value = "/photo", consumes = "multipart/form-data")
    public ApiResponse<Map<String, Object>> photo(@RequestParam("image") MultipartFile image)
            throws IOException {
        return ApiResponse.ok(
                aiService.photoToWord(SecurityUtils.currentUserId(),
                        image.getBytes(), image.getOriginalFilename(), image.getContentType()),
                "Đã nhận diện từ vựng từ ảnh.");
    }

    @GetMapping("/photos")
    public ApiResponse<List<Map<String, Object>>> photoHistory() {
        return ApiResponse.ok(aiService.photoHistory(SecurityUtils.currentUserId()));
    }

    /** Saves an app-recognized photo word (from the /photo result) to photo_words. */
    @PostMapping("/photo/save")
    public ApiResponse<Map<String, String>> savePhotoWord(@RequestBody Map<String, String> body) {
        Map<String, Object> saved = aiService.savePhotoWord(
                SecurityUtils.currentUserId(),
                body == null ? null : body.get("englishName"),
                body == null ? null : body.get("ipa"),
                body == null ? null : body.get("meaningVi"),
                body == null ? null : body.get("exampleEn"),
                body == null ? null : body.get("imageUrl"));
        return ApiResponse.ok(Map.of("id", String.valueOf(saved.get("id"))), "Đã lưu từ vựng từ ảnh.");
    }

    /** 6.3 Document analysis (PDF/DOCX/TXT/image). */
    @PostMapping(value = "/analyze-doc", consumes = "multipart/form-data")
    public ApiResponse<Map<String, Object>> analyzeDoc(@RequestParam("file") MultipartFile file)
            throws IOException {
        return ApiResponse.ok(
                aiService.analyzeDocument(SecurityUtils.currentUserId(),
                        file.getBytes(), file.getOriginalFilename(), file.getContentType()),
                "Đã phân tích tài liệu.");
    }

    @GetMapping("/docs")
    public ApiResponse<List<Map<String, Object>>> docHistory() {
        return ApiResponse.ok(aiService.docHistory(SecurityUtils.currentUserId()));
    }

    /** App alias of GET /api/ai/docs — same list. */
    @GetMapping("/docs/history")
    public ApiResponse<List<Map<String, Object>>> docHistoryAlias() {
        return ApiResponse.ok(aiService.docHistory(SecurityUtils.currentUserId()));
    }

    /** App alias of POST /api/ai/analyze-doc — same logic, returns {analysisId}. */
    @PostMapping(value = "/docs/upload", consumes = "multipart/form-data")
    public ApiResponse<Map<String, String>> uploadDoc(@RequestParam("file") MultipartFile file)
            throws IOException {
        Map<String, Object> result = aiService.analyzeDocument(SecurityUtils.currentUserId(),
                file.getBytes(), file.getOriginalFilename(), file.getContentType());
        return ApiResponse.ok(Map.of("analysisId", String.valueOf(result.get("id"))), "Đã phân tích tài liệu.");
    }

    @GetMapping("/docs/{id}")
    public ApiResponse<Map<String, Object>> getDoc(@PathVariable UUID id) {
        return ApiResponse.ok(aiService.getDoc(SecurityUtils.currentUserId(), id));
    }

    /** 6.4 Speaking coach samples (static sample data). */
    @GetMapping("/speaking/samples")
    public ApiResponse<List<Map<String, Object>>> speakingSamples() {
        return ApiResponse.ok(speakingFeatureService.samples());
    }

    /** 6.4 Speaking coach: multipart audio + sampleId -> SpeakingResult. */
    @PostMapping(value = "/speaking/score", consumes = "multipart/form-data")
    public ApiResponse<Map<String, Object>> scoreSpeaking(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam("sampleId") String sampleId) throws IOException {
        return ApiResponse.ok(
                speakingFeatureService.scoreAudio(SecurityUtils.currentUserId(), sampleId,
                        audio.getBytes(), audio.getOriginalFilename(), audio.getContentType()),
                "Đã chấm điểm phát âm.");
    }

    /** App alias of speaking history, mapped to the app contract. */
    @GetMapping("/speaking/history")
    public ApiResponse<List<Map<String, Object>>> speakingHistory() {
        return ApiResponse.ok(speakingFeatureService.historyForApp(SecurityUtils.currentUserId()));
    }

    /** 6.5 Hands-free voice learning: start a session of `count` words. */
    @PostMapping("/handsfree/session")
    public ApiResponse<Map<String, Object>> startHandsfree(@RequestBody Map<String, Object> body) {
        int count = 10;
        if (body != null && body.get("count") instanceof Number n) {
            count = n.intValue();
        }
        return ApiResponse.ok(
                speakingFeatureService.startHandsfreeSession(SecurityUtils.currentUserId(), count),
                "Đã tạo phiên luyện nói rảnh tay.");
    }

    /** 6.5 Hands-free voice learning: grade one voice answer. */
    @PostMapping(value = "/handsfree/answer", consumes = "multipart/form-data")
    public ApiResponse<Map<String, Object>> answerHandsfree(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam("sessionId") String sessionId,
            @RequestParam("itemId") String itemId) throws IOException {
        return ApiResponse.ok(
                speakingFeatureService.answerHandsfree(SecurityUtils.currentUserId(), sessionId, itemId,
                        audio.getBytes(), audio.getOriginalFilename(), audio.getContentType()));
    }

    /** 6.5 AI tutor chat proxy. */
    @PostMapping("/tutor")
    public ApiResponse<Map<String, Object>> tutor(@Valid @RequestBody TutorRequest req) {
        return ApiResponse.ok(aiService.tutor(SecurityUtils.currentUserId(), req.messages()));
    }
}
