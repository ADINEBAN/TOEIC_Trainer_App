package com.toeictrainer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record WordProgressRequest(
        UUID wordId,
        UUID customWordId,
        String status,          // new|learning|review|mastered
        Boolean favorite,
        Integer selfRating) {   // 0=again, 1=hard, 2=good, 3=easy (maps to SM-2 quality 0/3/4/5)
}
