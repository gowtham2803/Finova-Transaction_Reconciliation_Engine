package com.company.reconciliation.security;

import com.company.reconciliation.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {

    private TokenService tokenService;

    @BeforeEach
    void setUp() {
        tokenService = new TokenService("super-secure-secret-test-key-2026-reconciliation");
    }

    @Test
    void generateAndValidateToken_shouldSucceed() {
        User user = new User();
        user.setId(42L);
        user.setUsername("testuser");
        user.setEmail("test@yescapital.com");
        user.setFullName("Test User");
        user.setRole("Financial Operations Lead");

        String token = tokenService.generateToken(user);
        assertNotNull(token);
        assertEquals(3, token.split("\\.").length);

        UserPrincipal principal = tokenService.validateToken(token);
        assertNotNull(principal);
        assertEquals(42L, principal.getId());
        assertEquals("testuser", principal.getUsername());
        assertEquals("test@yescapital.com", principal.getEmail());
        assertEquals("Test User", principal.getFullName());
        assertEquals("Financial Operations Lead", principal.getRole());
    }

    @Test
    void validateToken_withInvalidSignature_shouldReturnNull() {
        User user = new User();
        user.setId(1L);
        user.setUsername("user1");
        user.setEmail("u1@example.com");

        String token = tokenService.generateToken(user);
        String tampered = token + "tampered";

        assertNull(tokenService.validateToken(tampered));
    }

    @Test
    void validateToken_withMalformedToken_shouldReturnNull() {
        assertNull(tokenService.validateToken("not.a.valid.jwt"));
        assertNull(tokenService.validateToken(""));
        assertNull(tokenService.validateToken(null));
    }
}
