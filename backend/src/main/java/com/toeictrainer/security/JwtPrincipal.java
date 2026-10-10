package com.toeictrainer.security;

import java.util.UUID;

/** Authenticated identity extracted from the JWT. user_id always comes from here. */
public record JwtPrincipal(UUID userId, String email, String role) {
}
