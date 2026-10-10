package com.toeictrainer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CustomWordRequest(
        @NotBlank @Size(max = 120) String word,
        @Size(max = 160) String ipa,
        @Size(max = 40) String partOfSpeech,
        @Size(max = 255) String meaningVi,
        String definitionEn,
        String exampleEn,
        String exampleVi,
        @Size(max = 80) String topic) {
}
