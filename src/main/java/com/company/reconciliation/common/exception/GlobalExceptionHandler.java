
package com.company.reconciliation.common.exception;

import com.company.reconciliation.common.response.ApiResponse;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles application-specific exceptions.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(
            ApiException exception) {

        log.warn("API exception: {}", exception.getMessage());

        ApiResponse<Void> response =
                ApiResponse.error(exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /**
     * Handles resources that cannot be found.
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(
            EntityNotFoundException exception) {

        log.warn("Resource not found: {}", exception.getMessage());

        ApiResponse<Void> response =
                ApiResponse.error(exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(response);
    }

    /**
     * Handles invalid arguments and request values.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(
            IllegalArgumentException exception) {

        log.warn("Invalid argument: {}", exception.getMessage());

        ApiResponse<Void> response =
                ApiResponse.error(exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /**
     * Handles operations that are not valid in the current state.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(
            IllegalStateException exception) {

        log.warn("Invalid application state: {}", exception.getMessage());

        ApiResponse<Void> response =
                ApiResponse.error(exception.getMessage());

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    /**
     * Handles ResponseStatusException thrown by controllers.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatusException(
            ResponseStatusException exception) {

        log.warn("Request failed with status {}: {}",
                exception.getStatusCode(),
                exception.getReason());

        String message = exception.getReason() != null
                ? exception.getReason()
                : "Request could not be completed";

        ApiResponse<Void> response =
                ApiResponse.error(message);

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(response);
    }

    /**
     * Handles missing or malformed request bodies.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception) {

        log.warn("Invalid or missing request body: {}",
                exception.getMessage());

        ApiResponse<Void> response =
                ApiResponse.error(
                        "Request body is missing or invalid"
                );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /**
     * Handles Bean Validation errors (@Valid).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception) {

        log.warn("Validation failed: {}", exception.getMessage());

        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse("Validation failed");

        ApiResponse<Void> response = ApiResponse.error(message);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    /**
     * Handles database constraints and unique violations.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(
            DataIntegrityViolationException exception) {

        log.warn("Database integrity violation: {}", exception.getMessage());

        String details = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";
        String message = "Database integrity violation";
        if (details.contains("uk_reconciliations_name") || details.contains("reconciliation_name") || details.contains("duplicate entry")) {
            message = "A reconciliation with this name already exists. Please choose a different name.";
        }

        ApiResponse<Void> response = ApiResponse.error(message);

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    /**
     * Handles all other unexpected exceptions.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(
            Exception exception) {

        log.error("Unexpected error occurred", exception);

        ApiResponse<Void> response =
                ApiResponse.error("An unexpected error occurred");

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(response);
    }
}