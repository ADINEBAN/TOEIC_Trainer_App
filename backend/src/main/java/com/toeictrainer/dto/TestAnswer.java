package com.toeictrainer.dto;

import java.util.List;
import java.util.UUID;

/** One mock-test answer: the selected option index (null = skipped). */
public record TestAnswer(UUID questionId, Integer selected) {
}
