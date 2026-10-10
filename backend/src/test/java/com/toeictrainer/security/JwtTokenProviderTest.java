package com.toeictrainer.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-that-is-at-least-32-bytes-long-12345";

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, 3_600_000L);
    }

    @Test
    void generateAndValidate_roundTrip() {
        UUID userId = UUID.randomUUID();
        String token = provider.generateToken(userId, "test@example.com", "USER");

        assertNotNull(token);
        assertTrue(provider.validateToken(token));

        JwtPrincipal principal = provider.getPrincipal(token);
        assertEquals(userId, principal.userId());
        assertEquals("test@example.com", principal.email());
        assertEquals("USER", principal.role());
    }

    @Test
    void tamperedToken_isRejected() {
        String token = provider.generateToken(UUID.randomUUID(), "a@b.c", "USER");
        String tampered = token.substring(0, token.length() - 2) + "xx";
        assertFalse(provider.validateToken(tampered));
    }

    @Test
    void tokenFromOtherSecret_isRejected() {
        JwtTokenProvider other = new JwtTokenProvider(
                "a-different-secret-key-that-is-also-32-bytes-xx", 3_600_000L);
        String token = other.generateToken(UUID.randomUUID(), "a@b.c", "USER");
        assertFalse(provider.validateToken(token));
    }

    @Test
    void garbageToken_isRejected() {
        assertFalse(provider.validateToken("not-a-token"));
        assertFalse(provider.validateToken(""));
        assertFalse(provider.validateToken(null));
    }

    @Test
    void adminRole_isPreserved() {
        UUID userId = UUID.randomUUID();
        String token = provider.generateToken(userId, "admin@example.com", "ADMIN");
        assertEquals("ADMIN", provider.getPrincipal(token).role());
    }

    @Test
    void shortSecret_isRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> new JwtTokenProvider("too-short", 3_600_000L));
    }
}
