package com.toeictrainer.dto;

import java.util.UUID;

/**
 * Login/register response matching the app contract: {token, user}.
 * user.name maps to the users.display_name column; targetScore is optional.
 */
public record AuthResponse(String token, UserSummary user) {

    public record UserSummary(
            UUID id,
            String email,
            String name,
            String role,
            Integer targetScore) {
    }
}
