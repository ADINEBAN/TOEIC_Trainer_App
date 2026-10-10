package com.toeictrainer.service;

import com.toeictrainer.common.ApiException;
import com.toeictrainer.domain.CustomWord;
import com.toeictrainer.domain.WordProgress;
import com.toeictrainer.dto.CustomWordRequest;
import com.toeictrainer.dto.WordProgressRequest;
import com.toeictrainer.repo.CustomWordRepository;
import com.toeictrainer.repo.VocabularyRepository;
import com.toeictrainer.repo.WordProgressRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Vocabulary search, custom words, and SRS progress upsert. */
@Service
public class VocabService {

    private final VocabularyRepository vocabulary;
    private final CustomWordRepository customWords;
    private final WordProgressRepository progress;
    private final SrsService srs;

    public VocabService(VocabularyRepository vocabulary,
                        CustomWordRepository customWords,
                        WordProgressRepository progress,
                        SrsService srs) {
        this.vocabulary = vocabulary;
        this.customWords = customWords;
        this.progress = progress;
        this.srs = srs;
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> searchVocab(String topic, String q, int page, int size) {
        return vocabulary.search(blankToNull(topic), blankToNull(q), PageRequest.of(page, Math.min(size, 100)))
                .map(this::toVocabMap);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVocab(UUID id) {
        return vocabulary.findById(id)
                .map(this::toVocabMap)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy từ vựng."));
    }

    @Transactional(readOnly = true)
    public List<String> topics() {
        return vocabulary.findDistinctTopics();
    }

    // ==================================================================
    // Flashcards (SRS): due words + rating reviews
    // ==================================================================
    /** Words due for review (next_review_at <= now or never scheduled), ordered and limited. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> dueFlashcards(UUID userId, int limit) {
        int n = Math.min(Math.max(limit, 1), 100);
        Instant now = Instant.now();
        List<WordProgress> all = progress.findByUserId(userId);
        List<WordProgress> due = new ArrayList<>(all.stream()
                .filter(p -> p.getNextReviewAt() == null || !p.getNextReviewAt().isAfter(now))
                .sorted((a, b) -> {
                    if (a.getNextReviewAt() == null && b.getNextReviewAt() == null) {
                        return 0;
                    }
                    if (a.getNextReviewAt() == null) {
                        return -1;
                    }
                    if (b.getNextReviewAt() == null) {
                        return 1;
                    }
                    return a.getNextReviewAt().compareTo(b.getNextReviewAt());
                })
                .toList());

        List<Map<String, Object>> out = new ArrayList<>();
        for (WordProgress p : due) {
            if (out.size() >= n) {
                break;
            }
            toWordMap(p.getWordId(), p.getCustomWordId()).ifPresent(out::add);
        }
        // Fill remaining slots with words the user has never reviewed.
        if (out.size() < n) {
            java.util.Set<UUID> seen = new java.util.HashSet<>();
            for (WordProgress p : all) {
                if (p.getWordId() != null) {
                    seen.add(p.getWordId());
                }
            }
            for (com.toeictrainer.domain.Vocabulary v : vocabulary.findRandom(n - out.size())) {
                if (seen.add(v.getId())) {
                    out.add(toVocabMap(v));
                }
                if (out.size() >= n) {
                    break;
                }
            }
        }
        return out;
    }

    /**
     * Reviews one flashcard with an SRS rating (again|hard|good|easy).
     * Returns {nextReviewAt}.
     */
    @Transactional
    public Map<String, Object> reviewFlashcard(UUID userId, UUID wordId, UUID customWordId, String rating) {
        if (wordId == null && customWordId == null) {
            throw ApiException.badRequest("Thiếu wordId hoặc customWordId.");
        }
        int selfRating = switch (rating == null ? "" : rating.trim().toLowerCase()) {
            case "again" -> 0;
            case "hard" -> 1;
            case "good" -> 2;
            case "easy" -> 3;
            default -> throw ApiException.badRequest("rating phải là again|hard|good|easy.");
        };
        Map<String, Object> result = upsertProgress(
                userId, new WordProgressRequest(wordId, customWordId, null, null, selfRating));
        return Map.of("nextReviewAt", result.get("nextReviewAt"));
    }

    /** Resolves a progress row to the app-facing word shape (system or custom word). */
    @Transactional(readOnly = true)
    public java.util.Optional<Map<String, Object>> toWordMap(UUID wordId, UUID customWordId) {
        if (wordId != null) {
            return vocabulary.findById(wordId).map(this::toVocabMap);
        }
        if (customWordId != null) {
            return customWords.findById(customWordId).map(this::toCustomWordMap);
        }
        return java.util.Optional.empty();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCustomWords(UUID userId) {
        return customWords.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toCustomWordMap)
                .toList();
    }

    @Transactional
    public Map<String, Object> createCustomWord(UUID userId, CustomWordRequest req) {
        customWords.findByUserIdAndWordIgnoreCase(userId, req.word().trim()).ifPresent(w -> {
            throw ApiException.conflict("Từ này đã có trong danh sách của bạn.");
        });
        CustomWord w = new CustomWord();
        w.setUserId(userId);
        apply(w, req);
        return toCustomWordMap(customWords.save(w));
    }

    @Transactional
    public Map<String, Object> updateCustomWord(UUID userId, UUID id, CustomWordRequest req) {
        CustomWord w = customWords.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy từ."));
        apply(w, req);
        return toCustomWordMap(customWords.save(w));
    }

    @Transactional
    public void deleteCustomWord(UUID userId, UUID id) {
        CustomWord w = customWords.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy từ."));
        progress.findByUserIdAndCustomWordId(userId, id).ifPresent(progress::delete);
        customWords.delete(w);
    }

    /**
     * Upserts progress for a system word or a custom word.
     * If selfRating is provided, SM-2 computes the next review time.
     */
    @Transactional
    public Map<String, Object> upsertProgress(UUID userId, WordProgressRequest req) {
        if (req.wordId() == null && req.customWordId() == null) {
            throw ApiException.badRequest("Thiếu wordId hoặc customWordId.");
        }
        if (req.wordId() != null && !vocabulary.existsById(req.wordId())) {
            throw ApiException.notFound("Không tìm thấy từ vựng.");
        }
        if (req.customWordId() != null && !customWords.existsByIdAndUserId(req.customWordId(), userId)) {
            throw ApiException.notFound("Không tìm thấy từ của bạn.");
        }

        WordProgress p = req.wordId() != null
                ? progress.findByUserIdAndWordId(userId, req.wordId()).orElseGet(WordProgress::new)
                : progress.findByUserIdAndCustomWordId(userId, req.customWordId()).orElseGet(WordProgress::new);
        boolean isNew = p.getId() == null;
        if (isNew) {
            p.setUserId(userId);
            p.setWordId(req.wordId());
            p.setCustomWordId(req.customWordId());
        }

        if (req.status() != null) {
            p.setStatus(switch (req.status()) {
                case "new", "learning", "review", "mastered" -> req.status();
                default -> throw ApiException.badRequest("Trạng thái không hợp lệ.");
            });
        }
        if (req.favorite() != null) {
            p.setFavorite(req.favorite());
        }
        if (req.selfRating() != null) {
            int rating = req.selfRating();
            if (rating < 0 || rating > 3) {
                throw ApiException.badRequest("selfRating phải từ 0 đến 3.");
            }
            SrsService.SrsResult r = srs.review(rating, p.getRepetitions(), p.getEasiness(), Instant.now());
            p.setRepetitions(r.repetitions());
            p.setEasiness(r.easiness());
            p.setNextReviewAt(r.nextReviewAt());
            p.setLastReviewAt(Instant.now());
            if (p.getStatus().equals("new")) {
                p.setStatus(r.status());
            }
        } else if (isNew && p.getNextReviewAt() == null) {
            SrsService.SrsResult r = srs.initial(Instant.now());
            p.setNextReviewAt(r.nextReviewAt());
        }

        WordProgress saved = progress.save(p);
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("id", saved.getId().toString());
        out.put("wordId", strOrNull(saved.getWordId()));
        out.put("customWordId", strOrNull(saved.getCustomWordId()));
        out.put("status", saved.getStatus());
        out.put("favorite", saved.isFavorite());
        out.put("repetitions", saved.getRepetitions());
        out.put("easiness", saved.getEasiness());
        out.put("nextReviewAt", saved.getNextReviewAt() == null ? null : saved.getNextReviewAt().toString());
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listProgress(UUID userId, boolean dueOnly) {
        List<WordProgress> list = dueOnly
                ? progress.findByUserIdAndNextReviewAtBefore(userId, Instant.now())
                : progress.findByUserId(userId);
        return list.stream().map(p -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", p.getId().toString());
            m.put("wordId", strOrNull(p.getWordId()));
            m.put("customWordId", strOrNull(p.getCustomWordId()));
            m.put("status", p.getStatus());
            m.put("favorite", p.isFavorite());
            m.put("repetitions", p.getRepetitions());
            m.put("easiness", p.getEasiness());
            m.put("nextReviewAt", p.getNextReviewAt() == null ? null : p.getNextReviewAt().toString());
            return m;
        }).toList();
    }

    private void apply(CustomWord w, CustomWordRequest req) {
        w.setWord(req.word().trim());
        w.setIpa(req.ipa());
        w.setPartOfSpeech(req.partOfSpeech());
        w.setMeaningVi(req.meaningVi());
        w.setDefinitionEn(req.definitionEn());
        w.setExampleEn(req.exampleEn());
        w.setExampleVi(req.exampleVi());
        w.setTopic(req.topic());
    }

    /**
     * App-facing word shape: {id, word, ipa, meaningVi, meaningEn, exampleEn,
     * exampleVi, topic, level, custom}. Legacy keys (partOfSpeech, definitionEn)
     * are kept so existing consumers keep working.
     */
    private Map<String, Object> toVocabMap(com.toeictrainer.domain.Vocabulary v) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", v.getId().toString());
        m.put("word", v.getWord());
        m.put("ipa", strOrEmpty(v.getIpa()));
        m.put("partOfSpeech", strOrEmpty(v.getPartOfSpeech()));
        m.put("meaningVi", v.getMeaningVi());
        m.put("meaningEn", strOrEmpty(v.getDefinitionEn()));
        m.put("definitionEn", strOrEmpty(v.getDefinitionEn()));
        m.put("exampleEn", strOrEmpty(v.getExampleEn()));
        m.put("exampleVi", strOrEmpty(v.getExampleVi()));
        m.put("topic", strOrEmpty(v.getTopic()));
        m.put("level", strOrEmpty(v.getLevel()));
        m.put("custom", false);
        return m;
    }

    private Map<String, Object> toCustomWordMap(CustomWord w) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", w.getId().toString());
        m.put("word", w.getWord());
        m.put("ipa", strOrEmpty(w.getIpa()));
        m.put("partOfSpeech", strOrEmpty(w.getPartOfSpeech()));
        m.put("meaningVi", strOrEmpty(w.getMeaningVi()));
        m.put("meaningEn", strOrEmpty(w.getDefinitionEn()));
        m.put("definitionEn", strOrEmpty(w.getDefinitionEn()));
        m.put("exampleEn", strOrEmpty(w.getExampleEn()));
        m.put("exampleVi", strOrEmpty(w.getExampleVi()));
        m.put("topic", strOrEmpty(w.getTopic()));
        m.put("level", "");
        m.put("custom", true);
        return m;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String strOrEmpty(String s) {
        return s == null ? "" : s;
    }

    private static Object strOrNull(UUID id) {
        return id == null ? null : id.toString();
    }
}
