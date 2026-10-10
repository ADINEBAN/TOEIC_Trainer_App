package com.toeictrainer.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * SM-2 spaced repetition (SuperMemo 2), simplified.
 * selfRating: 0 = again, 1 = hard, 2 = good, 3 = easy.
 * Pure functions — fully unit-testable without a database.
 */
@Service
public class SrsService {

    public record SrsResult(int repetitions, double easiness, Instant nextReviewAt, String status) {
    }

    /** quality 0..5 mapped from the 4 self-ratings: again=0, hard=3, good=4, easy=5 */
    static int toQuality(int selfRating) {
        return switch (selfRating) {
            case 0 -> 0;
            case 1 -> 3;
            case 2 -> 4;
            case 3 -> 5;
            default -> throw new IllegalArgumentException("selfRating must be 0..3");
        };
    }

    public SrsResult review(int selfRating, int currentRepetitions, double currentEasiness, Instant now) {
        int quality = toQuality(selfRating);

        double easiness = currentEasiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easiness < 1.3) {
            easiness = 1.3;
        }

        int repetitions;
        long intervalDays;
        if (quality < 3) {
            repetitions = 0;
            intervalDays = 1; // again soon (next day)
        } else {
            repetitions = currentRepetitions + 1;
            intervalDays = switch (repetitions) {
                case 1 -> 1;
                case 2 -> 6;
                default -> Math.round((repetitions - 1) * easiness);
            };
        }

        String status = repetitions == 0 ? "learning" : (repetitions >= 5 ? "mastered" : "review");
        if (quality < 3 && currentRepetitions == 0) {
            status = "learning";
        }

        Instant nextReviewAt = now.plus(Duration.ofDays(Math.max(1, intervalDays)));
        return new SrsResult(repetitions, round2(easiness), nextReviewAt, status);
    }

    /** Initial schedule for a brand-new word (first review tomorrow). */
    public SrsResult initial(Instant now) {
        return new SrsResult(0, 2.5, now.plus(Duration.ofDays(1)), "learning");
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
