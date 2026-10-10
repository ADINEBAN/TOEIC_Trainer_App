package com.toeictrainer.dto;

import java.util.List;
import java.util.UUID;

/** Submit a mock test: answers plus optional client-side metadata. */
public record TestSubmitRequest(
        List<TestAnswer> answers,
        List<UUID> flagged,
        Long durationSeconds) {
}
