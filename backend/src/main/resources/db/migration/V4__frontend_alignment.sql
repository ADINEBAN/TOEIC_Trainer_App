-- ============================================================================
-- V4 — Frontend contract alignment (2026-10-11)
--   * users.target_score (onboarding + dashboard)
--   * user_stats.daily_goal_minutes (onboarding + dashboard)
--   * question_bookmarks (notebook bookmarks)
--   * test_sessions (Mini/Half/Full mock tests)
-- ============================================================================

ALTER TABLE users ADD COLUMN target_score INT;
ALTER TABLE user_stats ADD COLUMN daily_goal_minutes INT NOT NULL DEFAULT 60;

-- ----------------------------------------------------------------------------
-- question_bookmarks (notebook: user-saved questions)
-- ----------------------------------------------------------------------------
CREATE TABLE question_bookmarks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_question_bookmarks UNIQUE (user_id, question_id)
);
CREATE INDEX idx_question_bookmarks_user ON question_bookmarks (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- test_sessions (Mini/Half/Full mock tests; JSONB keeps the bank schema stable)
-- ----------------------------------------------------------------------------
CREATE TABLE test_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind            VARCHAR(20) NOT NULL,        -- MINI|HALF|FULL
    question_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers         JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{questionId, selectedIndex}]
    submitted       BOOLEAN NOT NULL DEFAULT FALSE,
    listening_score INT,
    reading_score   INT,
    total_score     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_test_sessions_user ON test_sessions (user_id, created_at DESC);
