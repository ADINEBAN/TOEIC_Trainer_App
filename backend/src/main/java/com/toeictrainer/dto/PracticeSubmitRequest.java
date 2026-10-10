package com.toeictrainer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PracticeSubmitRequest(
        @NotBlank String mode,   // practice|mini|half|full|handsfree
        Integer part,
        List<PracticeAnswer> answers) {
}
