package com.toeictrainer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record GrammarLessonRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 20) String level,
        @NotBlank String content,
        String quiz) {
}
