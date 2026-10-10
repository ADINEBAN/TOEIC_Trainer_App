package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.GrammarLesson;
import com.toeictrainer.domain.Question;
import com.toeictrainer.domain.Vocabulary;
import com.toeictrainer.dto.GrammarLessonRequest;
import com.toeictrainer.dto.QuestionRequest;
import com.toeictrainer.dto.TestAnswer;
import com.toeictrainer.dto.VocabularyRequest;
import com.toeictrainer.repo.CustomWordRepository;
import com.toeictrainer.repo.DocAnalysisRepository;
import com.toeictrainer.repo.GrammarLessonRepository;
import com.toeictrainer.repo.PhotoWordRepository;
import com.toeictrainer.repo.PracticeAttemptRepository;
import com.toeictrainer.repo.QuestionRepository;
import com.toeictrainer.repo.UserRepository;
import com.toeictrainer.repo.UserStatsRepository;
import com.toeictrainer.repo.VocabularyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin: user overview, vocabulary / question / grammar CRUD. */
@Service
public class AdminService {

    private final UserRepository users;
    private final VocabularyRepository vocabulary;
    private final QuestionRepository questions;
    private final GrammarLessonRepository grammar;
    private final PracticeAttemptRepository attempts;
    private final DocAnalysisRepository docs;
    private final PhotoWordRepository photos;
    private final CustomWordRepository customWords;
    private final UserStatsRepository userStats;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public AdminService(UserRepository users,
                        VocabularyRepository vocabulary,
                        QuestionRepository questions,
                        GrammarLessonRepository grammar,
                        PracticeAttemptRepository attempts,
                        DocAnalysisRepository docs,
                        PhotoWordRepository photos,
                        CustomWordRepository customWords,
                        UserStatsRepository userStats,
                        com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.users = users;
        this.vocabulary = vocabulary;
        this.questions = questions;
        this.grammar = grammar;
        this.attempts = attempts;
        this.docs = docs;
        this.photos = photos;
        this.customWords = customWords;
        this.userStats = userStats;
        this.objectMapper = objectMapper;
    }

    // ---------------- Overview ----------------
    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<String, Object> m = new LinkedHashMap<>();
        // App-facing keys (admin dashboard contract).
        m.put("totalUsers", users.count());
        m.put("totalQuestions", questions.count());
        m.put("totalWords", vocabulary.count() + customWords.count());
        m.put("totalLessons", grammar.count());
        m.put("dau", userStats.countByLastActiveDate(LocalDate.now()));
        m.put("attemptsToday", attempts.countSince(startOfDay));
        // Legacy keys kept for existing consumers.
        m.put("users", users.count());
        m.put("vocabulary", vocabulary.count());
        m.put("questions", questions.count());
        m.put("grammarLessons", grammar.count());
        m.put("practiceAttempts", attempts.count());
        m.put("docAnalyses", docs.count());
        m.put("photoWords", photos.count());
        m.put("customWords", customWords.count());
        return m;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listUsers(int page, int size) {
        return users.findAll(PageRequest.of(page, Math.min(size, 100))).map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId().toString());
            m.put("email", u.getEmail());
            m.put("displayName", u.getDisplayName() == null ? "" : u.getDisplayName());
            m.put("role", u.getRole());
            m.put("createdAt", u.getCreatedAt().toString());
            return m;
        });
    }

    // ---------------- Vocabulary CRUD ----------------
    @Transactional(readOnly = true)
    public Page<Map<String, Object>> listVocabulary(String topic, String q, int page, int size) {
        return vocabulary.search(blankToNull(topic), blankToNull(q), PageRequest.of(page, Math.min(size, 100)))
                .map(this::toVocabMap);
    }

    @Transactional
    public Map<String, Object> createVocabulary(VocabularyRequest req) {
        return toVocabMap(vocabulary.save(applyVocab(new Vocabulary(), req)));
    }

    @Transactional
    public Map<String, Object> updateVocabulary(UUID id, VocabularyRequest req) {
        Vocabulary v = vocabulary.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy từ vựng."));
        return toVocabMap(vocabulary.save(applyVocab(v, req)));
    }

    @Transactional
    public void deleteVocabulary(UUID id) {
        if (!vocabulary.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy từ vựng.");
        }
        vocabulary.deleteById(id);
    }

    // ---------------- Question CRUD ----------------
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listQuestions(Integer part, String mode) {
        List<Question> list;
        if (part != null && mode != null) {
            list = questions.findByPartAndMode(part, mode);
        } else if (mode != null) {
            list = questions.findByMode(mode);
        } else {
            list = questions.findAll();
        }
        return list.stream().map(this::toQuestionMap).toList();
    }

    @Transactional
    public Map<String, Object> createQuestion(QuestionRequest req) {
        return toQuestionMap(questions.save(applyQuestion(new Question(), req)));
    }

    @Transactional
    public Map<String, Object> updateQuestion(UUID id, QuestionRequest req) {
        Question q = questions.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy câu hỏi."));
        return toQuestionMap(questions.save(applyQuestion(q, req)));
    }

    @Transactional
    public void deleteQuestion(UUID id) {
        if (!questions.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy câu hỏi.");
        }
        questions.deleteById(id);
    }

    // ---------------- Grammar CRUD ----------------
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listGrammar() {
        return grammar.findAllByOrderByCreatedAtAsc().stream().map(this::toGrammarMap).toList();
    }

    /** App-facing summaries: {id, title, summary, level} (no content/quiz). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listGrammarSummaries() {
        return grammar.findAllByOrderByCreatedAtAsc().stream().map(g -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", g.getId().toString());
            m.put("title", g.getTitle());
            m.put("summary", summaryOf(g.getContent()));
            m.put("level", str(g.getLevel()));
            return m;
        }).toList();
    }

    /** Full lesson detail for the app (content + quiz + derived summary). */
    @Transactional(readOnly = true)
    public Map<String, Object> getGrammarDetail(UUID id) {
        GrammarLesson g = grammar.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài ngữ pháp."));
        Map<String, Object> m = toGrammarMap(g);
        m.put("summary", summaryOf(g.getContent()));
        return m;
    }

    /**
     * Grades a grammar lesson mini-quiz. Answers arrive as
     * [{questionId, selected}]; questionId is the item index (as string) when
     * quiz items carry no id, otherwise matching falls back to list position.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> gradeGrammarQuiz(UUID id, List<TestAnswer> answers) {
        GrammarLesson g = grammar.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài ngữ pháp."));
        List<Map<String, Object>> quiz = readQuiz(g.getQuiz());
        List<TestAnswer> list = answers == null ? List.of() : answers;
        int score = 0;
        for (int i = 0; i < quiz.size(); i++) {
            Integer key = quizAnswerKey(quiz.get(i));
            Integer selected = selectedFor(list, i);
            if (key != null && key.equals(selected)) {
                score++;
            }
        }
        return Map.of("score", score, "total", quiz.size());
    }

    private static String summaryOf(String content) {
        if (content == null || content.isBlank()) {
            return "";
        }
        String oneLine = content.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= 200 ? oneLine : oneLine.substring(0, 200) + "…";
    }

    private List<Map<String, Object>> readQuiz(String json) {
        try {
            List<Map<String, Object>> list = objectMapper.readValue(json,
                    new com.fasterxml.jackson.core.type.TypeReference<>() {
                    });
            return list == null ? List.of() : list;
        } catch (Exception e) {
            return List.of();
        }
    }

    private static Integer quizAnswerKey(Map<String, Object> item) {
        for (String key : new String[]{"answer_index", "answerIndex", "correctIndex"}) {
            if (item.get(key) instanceof Number n) {
                return n.intValue();
            }
        }
        return null;
    }

    private static Integer selectedFor(List<TestAnswer> answers, int index) {
        for (TestAnswer a : answers) {
            if (a.questionId() == null) {
                continue;
            }
            try {
                if (Integer.parseInt(a.questionId().toString()) == index) {
                    return a.selected();
                }
            } catch (NumberFormatException ignored) {
                // fall through to positional matching
            }
        }
        return index < answers.size() ? answers.get(index).selected() : null;
    }

    @Transactional
    public Map<String, Object> createGrammar(GrammarLessonRequest req) {
        return toGrammarMap(grammar.save(applyGrammar(new GrammarLesson(), req)));
    }

    @Transactional
    public Map<String, Object> updateGrammar(UUID id, GrammarLessonRequest req) {
        GrammarLesson g = grammar.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy bài ngữ pháp."));
        return toGrammarMap(grammar.save(applyGrammar(g, req)));
    }

    @Transactional
    public void deleteGrammar(UUID id) {
        if (!grammar.existsById(id)) {
            throw ApiException.notFound("Không tìm thấy bài ngữ pháp.");
        }
        grammar.deleteById(id);
    }

    // ---------------- Mappers ----------------
    private Vocabulary applyVocab(Vocabulary v, VocabularyRequest req) {
        v.setWord(req.word().trim());
        v.setIpa(req.ipa());
        v.setPartOfSpeech(req.partOfSpeech());
        v.setMeaningVi(req.meaningVi());
        v.setDefinitionEn(req.definitionEn());
        v.setExampleEn(req.exampleEn());
        v.setExampleVi(req.exampleVi());
        v.setRelated(req.related());
        v.setTopic(req.topic());
        v.setLevel(req.level());
        return v;
    }

    private Map<String, Object> toVocabMap(Vocabulary v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId().toString());
        m.put("word", v.getWord());
        m.put("ipa", str(v.getIpa()));
        m.put("partOfSpeech", str(v.getPartOfSpeech()));
        m.put("meaningVi", v.getMeaningVi());
        m.put("definitionEn", str(v.getDefinitionEn()));
        m.put("exampleEn", str(v.getExampleEn()));
        m.put("exampleVi", str(v.getExampleVi()));
        m.put("topic", str(v.getTopic()));
        m.put("level", str(v.getLevel()));
        return m;
    }

    private Question applyQuestion(Question q, QuestionRequest req) {
        if (req.part() != null) {
            if (req.part() < 1 || req.part() > 7) {
                throw ApiException.badRequest("Part phải từ 1 đến 7.");
            }
            q.setPart(req.part());
        }
        if (req.mode() != null) {
            q.setMode(req.mode());
        }
        q.setQuestionJson(req.questionJson());
        q.setTopic(req.topic());
        q.setLevel(req.level());
        return q;
    }

    private Map<String, Object> toQuestionMap(Question q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId().toString());
        m.put("part", q.getPart());
        m.put("mode", q.getMode());
        m.put("questionJson", q.getQuestionJson());
        m.put("topic", str(q.getTopic()));
        m.put("level", str(q.getLevel()));
        return m;
    }

    private GrammarLesson applyGrammar(GrammarLesson g, GrammarLessonRequest req) {
        g.setTitle(req.title().trim());
        g.setLevel(req.level());
        g.setContent(req.content());
        if (req.quiz() != null) {
            g.setQuiz(req.quiz());
        }
        return g;
    }

    private Map<String, Object> toGrammarMap(GrammarLesson g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", g.getId().toString());
        m.put("title", g.getTitle());
        m.put("level", str(g.getLevel()));
        m.put("content", g.getContent());
        m.put("quiz", g.getQuiz());
        return m;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String str(String s) {
        return s == null ? "" : s;
    }
}
