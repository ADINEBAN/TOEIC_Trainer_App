package com.toeictrainer.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class SrsServiceTest {

    private final SrsService srs = new SrsService();

    @Test
    void again_resetsRepetitionsAndSchedulesTomorrow() {
        Instant now = Instant.now();
        SrsService.SrsResult r = srs.review(0, 3, 2.5, now);

        assertEquals(0, r.repetitions());
        assertEquals("learning", r.status());
        assertTrue(r.nextReviewAt().isAfter(now));
        assertTrue(Duration.between(now, r.nextReviewAt()).toHours() <= 25);
    }

    @Test
    void good_firstReview_schedulesOneDay() {
        Instant now = Instant.now();
        SrsService.SrsResult r = srs.review(2, 0, 2.5, now);

        assertEquals(1, r.repetitions());
        assertEquals("review", r.status());
        long hours = Duration.between(now, r.nextReviewAt()).toHours();
        assertTrue(hours >= 23 && hours <= 25, "expected ~24h, got " + hours);
    }

    @Test
    void good_secondReview_schedulesSixDays() {
        Instant now = Instant.now();
        SrsService.SrsResult r = srs.review(2, 1, 2.5, now);

        assertEquals(2, r.repetitions());
        long days = Duration.between(now, r.nextReviewAt()).toDays();
        assertTrue(days >= 5 && days <= 6, "expected ~6 days, got " + days);
    }

    @Test
    void easy_growsIntervalFasterThanGood() {
        Instant now = Instant.now();
        SrsService.SrsResult easy = srs.review(3, 2, 2.5, now);
        SrsService.SrsResult good = srs.review(2, 2, 2.5, now);

        assertTrue(easy.nextReviewAt().isAfter(good.nextReviewAt())
                || easy.nextReviewAt().equals(good.nextReviewAt()));
        assertTrue(easy.easiness() >= good.easiness());
    }

    @Test
    void easiness_neverDropsBelowMinimum() {
        SrsService.SrsResult r = srs.review(0, 0, 1.3, Instant.now());
        assertTrue(r.easiness() >= 1.3);
    }

    @Test
    void hard_keepsProgressButShorterThanGood() {
        Instant now = Instant.now();
        SrsService.SrsResult hard = srs.review(1, 2, 2.5, now);
        SrsService.SrsResult good = srs.review(2, 2, 2.5, now);

        assertEquals(3, hard.repetitions());
        assertTrue(hard.easiness() < good.easiness());
    }

    @Test
    void mastered_afterEnoughRepetitions() {
        SrsService.SrsResult r = srs.review(2, 4, 2.6, Instant.now());
        assertEquals(5, r.repetitions());
        assertEquals("mastered", r.status());
    }

    @Test
    void initial_schedulesTomorrow() {
        Instant now = Instant.now();
        SrsService.SrsResult r = srs.initial(now);
        assertEquals(0, r.repetitions());
        assertEquals(2.5, r.easiness());
        assertEquals("learning", r.status());
        long hours = Duration.between(now, r.nextReviewAt()).toHours();
        assertTrue(hours >= 23 && hours <= 25);
    }

    @Test
    void invalidRating_throws() {
        assertThrows(IllegalArgumentException.class, () -> srs.review(4, 0, 2.5, Instant.now()));
        assertThrows(IllegalArgumentException.class, () -> srs.review(-1, 0, 2.5, Instant.now()));
    }
}
