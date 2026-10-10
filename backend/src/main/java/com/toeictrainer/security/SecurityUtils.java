package com.toeictrainer.security;

import com.toeictrainer.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * Helper to resolve the current user id. Controllers/services must NEVER
 * accept a user_id from the client — always take it from the JWT principal.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtPrincipal principal)) {
            throw ApiException.unauthorized("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        return principal.userId();
    }

    public static JwtPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtPrincipal principal)) {
            throw ApiException.unauthorized("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        return principal;
    }
}
