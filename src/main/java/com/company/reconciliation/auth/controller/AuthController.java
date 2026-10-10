package com.company.reconciliation.auth.controller;

import com.company.reconciliation.auth.dto.AuthResponse;
import com.company.reconciliation.auth.dto.LoginRequest;
import com.company.reconciliation.auth.dto.RegisterRequest;
import com.company.reconciliation.auth.dto.UserResponse;
import com.company.reconciliation.auth.service.AuthService;
import com.company.reconciliation.common.response.ApiResponse;
import com.company.reconciliation.security.UserContext;
import com.company.reconciliation.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Authenticates user and returns JWT token + user details.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    /**
     * Registers a new user account, stores in MySQL, and returns JWT token + user details.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Account successfully registered", response));
    }

    /**
     * Returns details of the currently authenticated user based on Bearer token.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @RequestAttribute(value = "currentUser", required = false) UserPrincipal principal
    ) {
        if (principal == null) {
            principal = UserContext.getCurrentUser();
        }
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No active authenticated session found.");
        }

        UserResponse userResponse = authService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("User profile retrieved", userResponse));
    }
}
