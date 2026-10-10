package com.toeictrainer.common;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Pagination shape the Expo app expects:
 * { items, page, totalPages, total }.
 */
public record PagedResult<T>(List<T> items, int page, int totalPages, long total) {

    public static <T> PagedResult<T> of(Page<T> page) {
        return new PagedResult<>(page.getContent(), page.getNumber(),
                page.getTotalPages(), page.getTotalElements());
    }
}
