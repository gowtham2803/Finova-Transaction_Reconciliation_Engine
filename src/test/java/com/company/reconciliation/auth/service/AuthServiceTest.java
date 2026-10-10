package com.company.reconciliation.auth.service;

import com.company.reconciliation.auth.dto.AuthResponse;
import com.company.reconciliation.auth.dto.LoginRequest;
import com.company.reconciliation.auth.dto.RegisterRequest;
import com.company.reconciliation.auth.dto.UserResponse;
import com.company.reconciliation.security.PasswordService;
import com.company.reconciliation.security.TokenService;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @Mock
    private TokenService tokenService;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_withValidCredentials_shouldReturnAuthResponse() {
        User user = new User();
        user.setId(1L);
        user.setUsername("operations");
        user.setEmail("operations@yescapital.com");
        user.setPasswordHash("hashed_pass");
        user.setActive(true);

        when(userRepository.findByEmail("operations@yescapital.com")).thenReturn(Optional.of(user));
        when(passwordService.verifyPassword("Password@123", "hashed_pass")).thenReturn(true);
        when(tokenService.generateToken(user)).thenReturn("valid.jwt.token");
        when(tokenService.getExpirationSeconds()).thenReturn(86400L);

        LoginRequest req = new LoginRequest("operations@yescapital.com", "Password@123");
        AuthResponse resp = authService.login(req);

        assertNotNull(resp);
        assertEquals("valid.jwt.token", resp.getToken());
        assertEquals("operations", resp.getUser().getUsername());
        assertEquals("operations@yescapital.com", resp.getUser().getEmail());
    }

    @Test
    void login_withInvalidPassword_shouldThrowUnauthorized() {
        User user = new User();
        user.setId(1L);
        user.setUsername("operations");
        user.setEmail("operations@yescapital.com");
        user.setPasswordHash("hashed_pass");
        user.setActive(true);

        when(userRepository.findByEmail("operations@yescapital.com")).thenReturn(Optional.of(user));
        when(passwordService.verifyPassword("WrongPassword", "hashed_pass")).thenReturn(false);

        LoginRequest req = new LoginRequest("operations@yescapital.com", "WrongPassword");
        assertThrows(ResponseStatusException.class, () -> authService.login(req));
    }

    @Test
    void register_withValidDetails_shouldCreateUserAndReturnAuthResponse() {
        RegisterRequest req = new RegisterRequest(
                "Karthik Subramanian",
                "karthik",
                "karthik@yescapital.com",
                "Password@123",
                "Financial Operations Lead"
        );

        when(userRepository.existsByUsername("karthik")).thenReturn(false);
        when(userRepository.existsByEmail("karthik@yescapital.com")).thenReturn(false);
        when(passwordService.hashPassword("Password@123")).thenReturn("hashed_pass");

        User savedUser = new User();
        savedUser.setId(10L);
        savedUser.setUsername("karthik");
        savedUser.setEmail("karthik@yescapital.com");
        savedUser.setFullName("Karthik Subramanian");
        savedUser.setRole("Financial Operations Lead");
        savedUser.setActive(true);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(tokenService.generateToken(savedUser)).thenReturn("token123");
        when(tokenService.getExpirationSeconds()).thenReturn(86400L);

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("token123", resp.getToken());
        assertEquals("karthik", resp.getUser().getUsername());
        assertEquals("KS", resp.getUser().getInitials());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_withDuplicateEmail_shouldThrowConflict() {
        RegisterRequest req = new RegisterRequest(
                "Karthik Subramanian",
                "karthik",
                "karthik@yescapital.com",
                "Password@123",
                "Financial Operations Lead"
        );

        when(userRepository.existsByUsername("karthik")).thenReturn(false);
        when(userRepository.existsByEmail("karthik@yescapital.com")).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> authService.register(req));
    }

    @Test
    void register_withOnlyUsernameAndPassword_shouldSucceed() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("gowtham");
        req.setPassword("Password@123");

        when(userRepository.existsByUsername("gowtham")).thenReturn(false);
        when(userRepository.existsByEmail("gowtham@yescapital.com")).thenReturn(false);
        when(passwordService.hashPassword("Password@123")).thenReturn("hashed_pass");

        User savedUser = new User();
        savedUser.setId(20L);
        savedUser.setUsername("gowtham");
        savedUser.setEmail("gowtham@yescapital.com");
        savedUser.setFullName("gowtham");
        savedUser.setRole("Financial Operations Lead");
        savedUser.setActive(true);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(tokenService.generateToken(savedUser)).thenReturn("token_gowtham");
        when(tokenService.getExpirationSeconds()).thenReturn(86400L);

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("token_gowtham", resp.getToken());
        assertEquals("gowtham", resp.getUser().getUsername());
        assertEquals("gowtham@yescapital.com", resp.getUser().getEmail());
        assertEquals("gowtham", resp.getUser().getFullName());
    }

    @Test
    void getCurrentUser_shouldReturnUserResponse() {
        User user = new User();
        user.setId(1L);
        user.setUsername("operations");
        user.setEmail("operations@yescapital.com");
        user.setActive(true);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserResponse resp = authService.getCurrentUser(1L);
        assertNotNull(resp);
        assertEquals("operations", resp.getUsername());
    }
}
