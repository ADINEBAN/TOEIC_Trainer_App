package com.toeictrainer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.PlacementResult;
import com.toeictrainer.domain.Question;
import com.toeictrainer.dto.PlacementSubmitRequest;
import com.toeictrainer.dto.PracticeAnswer;
import com.toeictrainer.repo.PlacementResultRepository;
import com.toeictrainer.repo.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Placement test: short quiz -> estimated level + roadmap suggestion. */
@Service
public class PlacementService {

    private final QuestionRepository questions;
    private final PlacementResultRepository results;
    private final ObjectMapper objectMapper;

    public PlacementService(QuestionRepository questions,
                            PlacementResultRepository results,
                            ObjectMapper objectMapper) {
        this.questions = questions;
        this.results = results;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getQuiz() {
        List<Question> list = questions.findRandomByMode("placement", 12);
        if (list.isEmpty()) {
            throw ApiException.serviceUnavailable("Chưa có đề kiểm tra đầu vào. Vui lòng thử lại sau.");
        }
        return list.stream().map(q -> {
            Map<String, Object> body = readJson(q.getQuestionJson());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", q.getId().toString());
            m.put("part", q.getPart());
            m.putAll(body);
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> submit(UUID userId, PlacementSubmitRequest req) {
        List<PracticeAnswer> answers = req.answers() == null ? List.of() : req.answers();
        int correct = 0;
        for (PracticeAnswer a : answers) {
            Question q = questions.findById(a.questionId())
                    .orElseThrow(() -> ApiException.badRequest("Câu hỏi không tồn tại."));
            Object v = readJson(q.getQuestionJson()).get("answer_index");
            int correctIndex = v instanceof Number n ? n.intValue() : -1;
            if (a.selectedIndex() != null && a.selectedIndex() == correctIndex) {
                correct++;
            }
        }
        int total = Math.max(answers.size(), 1);
        double ratio = (double) correct / total;

        String level;
        int estimatedScore;
        if (ratio < 0.25) {
            level = "Beginner";
            estimatedScore = 250;
        } else if (ratio < 0.45) {
            level = "Elementary";
            estimatedScore = 400;
        } else if (ratio < 0.65) {
            level = "Intermediate";
            estimatedScore = 550;
        } else if (ratio < 0.85) {
            level = "Upper-Intermediate";
            estimatedScore = 700;
        } else {
            level = "Advanced";
            estimatedScore = 850;
        }

        PlacementResult r = new PlacementResult();
        r.setUserId(userId);
        r.setLevel(level);
        try {
            r.setScores(objectMapper.writeValueAsString(Map.of("correct", correct, "total", answers.size())));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        results.save(r);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("correct", correct);
        out.put("total", answers.size());
        out.put("level", level);
        out.put("estimatedScore", estimatedScore);
        out.put("roadmap", roadmapFor(level));
        return out;
    }

    private List<String> roadmapFor(String level) {
        return switch (level) {
            case "Beginner" -> List.of(
                    "Ôn 300 từ vựng cơ bản theo chủ đề Office và Travel.",
                    "Học lại ngữ pháp nền: thì hiện tại, quá khứ, giới từ.",
                    "Luyện Part 1 và Part 2 mỗi ngày 15 phút.");
            case "Elementary" -> List.of(
                    "Mở rộng vốn từ lên 600 từ, tập trung HR và Customer Service.",
                    "Luyện Part 5 (điền câu) và Part 7 đoạn ngắn.",
                    "Làm 1 bài Mini Test mỗi tuần.");
            case "Intermediate" -> List.of(
                    "Học từ vựng nâng cao: Finance, Marketing, Sales.",
                    "Luyện nghe Part 3 và Part 4 với tốc độ thật.",
                    "Làm Half Test 2 tuần một lần, ghi lại lỗi sai.");
            case "Upper-Intermediate" -> List.of(
                    "Luyện Full Test đúng giờ thi thật.",
                    "Ôn sâu Part 6 và Part 7 đoạn kép.",
                    "Dùng Speaking Coach để cải thiện phát âm.");
            default -> List.of(
                    "Duy trì streak học mỗi ngày với flashcard SRS.",
                    "Luyện đề Full Test và phân tích lỗi theo Part.",
                    "Đặt mục tiêu 900+ với lộ trình từ vựng chuyên sâu.");
        };
    }

    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw ApiException.serviceUnavailable("Dữ liệu câu hỏi bị lỗi.");
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(UUID userId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (PlacementResult r : results.findByUserIdOrderByCreatedAtDesc(userId)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId().toString());
            m.put("level", r.getLevel());
            m.put("scores", r.getScores());
            m.put("createdAt", r.getCreatedAt().toString());
            out.add(m);
        }
        return out;
    }
}
