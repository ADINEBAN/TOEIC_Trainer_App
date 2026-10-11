package com.toeictrainer.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** CORS for the Expo app / web admin. Set CORS_ALLOWED_ORIGINS in production. */
@Configuration
public class CorsConfig {

    @Value("${app.cors-allowed-origins:*}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(Optional.ofNullable(allowedOrigins)
                        .orElse("*")
                        .split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();

        List<String> wildcardPatterns = origins.stream()
                .filter(value -> value.contains("*"))
                .toList();
        List<String> explicitOrigins = origins.stream()
                .filter(value -> !value.contains("*"))
                .toList();

        if (!wildcardPatterns.isEmpty()) {
            config.setAllowedOriginPatterns(wildcardPatterns);
        }
        if (!explicitOrigins.isEmpty()) {
            config.setAllowedOrigins(explicitOrigins);
        }

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        config.setAllowCredentials(explicitOrigins.size() > 0 && wildcardPatterns.isEmpty());
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
