package com.toeictrainer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6, max = 100) String newPassword) {
}
