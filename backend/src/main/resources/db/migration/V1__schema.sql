-- ============================================================================
-- V1 — TOEIC Trainer core schema (PostgreSQL)
-- All user-owned tables cascade on user delete. Shared tables: vocabulary,
-- tts_cache. JSON payloads use JSONB.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(120),
    role          VARCHAR(20) NOT NULL DEFAULT 'USER'
                  CHECK (role IN ('USER', 'ADMIN')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users (email);

-- ----------------------------------------------------------------------------
-- password_reset_tokens
-- ----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens (user_id);

-- ----------------------------------------------------------------------------
-- vocabulary (shared word bank)
-- ----------------------------------------------------------------------------
CREATE TABLE vocabulary (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word           VARCHAR(120) NOT NULL,
    ipa            VARCHAR(160),
    part_of_speech VARCHAR(40),
    meaning_vi     VARCHAR(255) NOT NULL,
    definition_en  TEXT,
    example_en     TEXT,
    example_vi     TEXT,
    related        JSONB,            -- precomputed related words (optional)
    topic          VARCHAR(80),
    level          VARCHAR(20),      -- e.g. beginner/intermediate/advanced
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vocabulary_word  ON vocabulary (word);
CREATE INDEX idx_vocabulary_topic ON vocabulary (topic);

-- ----------------------------------------------------------------------------
-- word_relations (semantic network, AI-generated once, reused forever)
-- ----------------------------------------------------------------------------
CREATE TABLE word_relations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id         UUID NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
    related_word_id UUID REFERENCES vocabulary (id) ON DELETE SET NULL,
    related_word    VARCHAR(120) NOT NULL,  -- denormalized label (works for custom words too)
    relation_type   VARCHAR(40) NOT NULL
                    CHECK (relation_type IN ('synonym','antonym','word_family','collocation','related')),
    example_en      TEXT,
    example_vi      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_word_relations UNIQUE (word_id, related_word)
);
CREATE INDEX idx_word_relations_word ON word_relations (word_id);

-- ----------------------------------------------------------------------------
-- custom_words (user's own words) — created before word_progress (FK target)
-- ----------------------------------------------------------------------------
CREATE TABLE custom_words (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    word           VARCHAR(120) NOT NULL,
    ipa            VARCHAR(160),
    part_of_speech VARCHAR(40),
    meaning_vi     VARCHAR(255),
    definition_en  TEXT,
    example_en     TEXT,
    example_vi     TEXT,
    topic          VARCHAR(80),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_custom_words_user ON custom_words (user_id);
CREATE UNIQUE INDEX uq_custom_words_user_word ON custom_words (user_id, word);

-- ----------------------------------------------------------------------------
-- word_progress (per-user SRS state; word_id OR custom_word_id set)
-- ----------------------------------------------------------------------------
CREATE TABLE word_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    word_id         UUID REFERENCES vocabulary (id) ON DELETE CASCADE,
    custom_word_id  UUID REFERENCES custom_words (id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','learning','review','mastered')),
    favorite        BOOLEAN NOT NULL DEFAULT FALSE,
    repetitions     INT NOT NULL DEFAULT 0,
    easiness        DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    next_review_at  TIMESTAMPTZ,
    last_review_at  TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_progress_word CHECK (word_id IS NOT NULL OR custom_word_id IS NOT NULL)
);
CREATE INDEX idx_word_progress_user ON word_progress (user_id);
CREATE UNIQUE INDEX uq_progress_user_word
    ON word_progress (user_id, word_id) WHERE word_id IS NOT NULL;
CREATE UNIQUE INDEX uq_progress_user_custom
    ON word_progress (user_id, custom_word_id) WHERE custom_word_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- questions (Part 1-7 + placement question bank, admin-managed)
-- ----------------------------------------------------------------------------
CREATE TABLE questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part          INT NOT NULL CHECK (part BETWEEN 1 AND 7),
    mode          VARCHAR(20) NOT NULL DEFAULT 'practice'
                  CHECK (mode IN ('practice','placement','mock')),
    question_json JSONB NOT NULL,  -- {prompt, passage?, options[], answer_index, explanation, audio_hint?}
    topic         VARCHAR(80),
    level         VARCHAR(20),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_part_mode ON questions (part, mode);

-- ----------------------------------------------------------------------------
-- practice_attempts
-- ----------------------------------------------------------------------------
CREATE TABLE practice_attempts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mode       VARCHAR(20) NOT NULL DEFAULT 'practice'
               CHECK (mode IN ('practice','mini','half','full','handsfree')),
    part       INT CHECK (part BETWEEN 1 AND 7),
    score      INT NOT NULL DEFAULT 0,
    total      INT NOT NULL DEFAULT 0,
    detail     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- per-question answers
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_practice_attempts_user ON practice_attempts (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- placement_results
-- ----------------------------------------------------------------------------
CREATE TABLE placement_results (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scores     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {correct, total, per_part?}
    level      VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_placement_results_user ON placement_results (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- speaking_attempts
-- ----------------------------------------------------------------------------
CREATE TABLE speaking_attempts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sentence   TEXT NOT NULL,        -- target sentence
    transcript TEXT,                -- recognized transcript (from device STT)
    scores     JSONB NOT NULL DEFAULT '{}'::jsonb, -- 4 component scores
    feedback   TEXT,                 -- AI feedback (Vietnamese)
    fallback   BOOLEAN NOT NULL DEFAULT FALSE,     -- true when scored without AI
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_speaking_attempts_user ON speaking_attempts (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- user_stats
-- ----------------------------------------------------------------------------
CREATE TABLE user_stats (
    user_id         UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    xp              INT NOT NULL DEFAULT 0,
    level           INT NOT NULL DEFAULT 1,
    streak          INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    study_seconds   BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- tts_cache (system-wide cache keyed by content hash)
-- ----------------------------------------------------------------------------
CREATE TABLE tts_cache (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_hash  VARCHAR(64) NOT NULL UNIQUE,  -- sha256(text|voice|model)
    text       TEXT NOT NULL,
    voice      VARCHAR(40) NOT NULL,
    model      VARCHAR(40) NOT NULL,
    audio      BYTEA,                        -- MP3 bytes (small clips)
    chars      INT NOT NULL DEFAULT 0,       -- billable chars for this clip
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tts_cache_hash ON tts_cache (text_hash);

-- ----------------------------------------------------------------------------
-- doc_analyses (uploaded study docs + AI analysis results)
-- ----------------------------------------------------------------------------
CREATE TABLE doc_analyses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    filename       VARCHAR(255) NOT NULL,
    file_path      VARCHAR(512),      -- local path or Storage path
    extracted_text TEXT,
    result         JSONB NOT NULL DEFAULT '{}'::jsonb, -- vocab/grammar/tips/questions
    words_added    INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_analyses_user ON doc_analyses (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- photo_words (camera photo-to-word learning)
-- ----------------------------------------------------------------------------
CREATE TABLE photo_words (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    image_path VARCHAR(512) NOT NULL,  -- local path or Storage path
    word       VARCHAR(120) NOT NULL,
    ipa        VARCHAR(160),
    meaning_vi VARCHAR(255),
    example_en TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photo_words_user ON photo_words (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- grammar_lessons (admin-managed grammar content)
-- ----------------------------------------------------------------------------
CREATE TABLE grammar_lessons (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      VARCHAR(200) NOT NULL,
    level      VARCHAR(20),
    content    TEXT NOT NULL,        -- lesson body (markdown)
    quiz       JSONB NOT NULL DEFAULT '[]'::jsonb, -- mini quiz questions
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ai_usage_log (cost control + abuse detection for every AI call)
-- ----------------------------------------------------------------------------
CREATE TABLE ai_usage_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
    feature     VARCHAR(60) NOT NULL,  -- semantic|photo|doc|tutor|speaking
    input_chars INT NOT NULL DEFAULT 0,
    output_chars INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_usage_log_user_day ON ai_usage_log (user_id, created_at DESC);
