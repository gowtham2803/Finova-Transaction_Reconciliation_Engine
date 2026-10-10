package com.company.reconciliation.auth.controller;

import com.company.reconciliation.auth.dto.AuthResponse;
import com.company.reconciliation.auth.dto.LoginRequest;
import com.company.reconciliation.auth.dto.RegisterRequest;
import com.company.reconciliation.auth.dto.UserResponse;
import com.company.reconciliation.auth.service.AuthService;
import com.company.reconciliation.common.response.ApiResponse;
import com.company.reconciliation.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void login_shouldReturnOkResponse() {
        LoginRequest req = new LoginRequest("operations@yescapital.com", "Password@123");
        AuthResponse authResp = new AuthResponse("mock.token", "Bearer", 86400L, new UserResponse());
        when(authService.login(any(LoginRequest.class))).thenReturn(authResp);

        ResponseEntity<ApiResponse<AuthResponse>> response = authController.login(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("mock.token", response.getBody().getData().getToken());
    }

    @Test
    void register_shouldReturnCreatedResponse() {
        RegisterRequest req = new RegisterRequest("Test", "test", "test@example.com", "pass123", "Lead");
        AuthResponse authResp = new AuthResponse("mock.token", "Bearer", 86400L, new UserResponse());
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResp);

        ResponseEntity<ApiResponse<AuthResponse>> response = authController.register(req);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
    }

    @Test
    void getCurrentUser_shouldReturnUserResponse() {
        UserPrincipal principal = new UserPrincipal(1L, "operations", "ops@yescapital.com", "Ops Lead", "Role");
        UserResponse userResponse = new UserResponse();
        userResponse.setId(1L);
        userResponse.setUsername("operations");

        when(authService.getCurrentUser(1L)).thenReturn(userResponse);

        ResponseEntity<ApiResponse<UserResponse>> response = authController.getCurrentUser(principal);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("operations", response.getBody().getData().getUsername());
    }
}
