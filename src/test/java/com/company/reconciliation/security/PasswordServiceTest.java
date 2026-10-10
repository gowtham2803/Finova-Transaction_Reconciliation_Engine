package com.company.reconciliation.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordServiceTest {

    private PasswordService passwordService;

    @BeforeEach
    void setUp() {
        passwordService = new PasswordService();
    }

    @Test
    void hashPassword_shouldGenerateValidPBKDF2Hash() {
        String password = "SecretPassword@123";
        String hash = passwordService.hashPassword(password);

        assertNotNull(hash);
        assertTrue(hash.startsWith("pbkdf2$65536$"));

        String[] parts = hash.split("\\$");
        assertEquals(4, parts.length);
    }

    @Test
    void verifyPassword_shouldReturnTrueForCorrectPassword() {
        String password = "SecretPassword@123";
        String hash = passwordService.hashPassword(password);

        assertTrue(passwordService.verifyPassword(password, hash));
    }

    @Test
    void verifyPassword_shouldReturnFalseForWrongPassword() {
        String password = "SecretPassword@123";
        String hash = passwordService.hashPassword(password);

        assertFalse(passwordService.verifyPassword("WrongPassword", hash));
    }

    @Test
    void verifyPassword_shouldReturnFalseForNullOrMalformedHash() {
        assertFalse(passwordService.verifyPassword("password", null));
        assertFalse(passwordService.verifyPassword("password", "invalid_hash"));
        assertFalse(passwordService.verifyPassword("password", "NOT_CONFIGURED"));
    }
}
