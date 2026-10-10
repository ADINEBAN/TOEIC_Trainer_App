package com.toeictrainer.common;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Consistent JSON error body for every failure: {success, message, ...details}. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleApiException(
            ApiException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getMessage(), request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toVietnameseFieldMessage)
                .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Dữ liệu gửi lên không hợp lệ.";
        }
        return build(HttpStatus.BAD_REQUEST, message, request, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này.", request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleUnexpected(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled error at {}", request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.", request, null);
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> build(
            HttpStatus status, String message, HttpServletRequest request, Map<String, Object> extra) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", status.value());
        data.put("path", request.getRequestURI());
        data.put("timestamp", Instant.now().toString());
        if (extra != null) {
            data.putAll(extra);
        }
        return ResponseEntity.status(status).body(new ApiResponse<>(false, data, message));
    }

    private String toVietnameseFieldMessage(FieldError error) {
        String field = error.getField();
        String code = error.getCode();
        if ("NotBlank".equals(code) || "NotNull".equals(code) || "NotEmpty".equals(code)) {
            return "Trường '" + field + "' không được để trống.";
        }
        if ("Email".equals(code)) {
            return "Địa chỉ email không hợp lệ.";
        }
        if ("Size".equals(code)) {
            return "Trường '" + field + "' có độ dài không hợp lệ.";
        }
        if ("Min".equals(code) || "Max".equals(code) || "Positive".equals(code)) {
            return "Trường '" + field + "' có giá trị không hợp lệ.";
        }
        String msg = error.getDefaultMessage();
        return (msg == null || msg.isBlank()) ? "Trường '" + field + "' không hợp lệ." : msg;
    }
}
