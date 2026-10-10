package com.company.reconciliation.security;

import com.company.reconciliation.user.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enterprise HMAC-SHA256 Signed JWT Token Service.
 * Produces and validates tamper-proof self-contained bearer tokens
 * using Java 21 standard crypto and standard library.
 */
@Service
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long DEFAULT_EXPIRATION_SECONDS = 86400L; // 24 hours

    private final String secretKey;

    public TokenService(
            @Value("${security.jwt.secret:yescapital-enterprise-reconciliation-secure-jwt-secret-key-2026-sha256}")
            String secretKey
    ) {
        this.secretKey = secretKey;
    }

    /**
     * Generates a signed JWT token for the specified user.
     */
    public String generateToken(User user) {
        long now = Instant.now().getEpochSecond();
        long exp = now + DEFAULT_EXPIRATION_SECONDS;

        try {
            String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            String payloadJson = "{"
                    + "\"userId\":" + user.getId() + ","
                    + "\"username\":\"" + escapeJson(user.getUsername()) + "\","
                    + "\"email\":\"" + escapeJson(user.getEmail()) + "\","
                    + "\"fullName\":\"" + escapeJson(user.getFullName() != null ? user.getFullName() : user.getUsername()) + "\","
                    + "\"role\":\"" + escapeJson(user.getRole() != null ? user.getRole() : "Financial Operations Lead") + "\","
                    + "\"iat\":" + now + ","
                    + "\"exp\":" + exp
                    + "}";

            String encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
            String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

            String contentToSign = encodedHeader + "." + encodedPayload;
            String signature = sign(contentToSign);

            return contentToSign + "." + signature;
        } catch (Exception e) {
            log.error("Failed to generate token for user: {}", user.getUsername(), e);
            throw new IllegalStateException("Failed to generate authentication token", e);
        }
    }

    /**
     * Validates token signature, checks expiration, and extracts UserPrincipal.
     * Returns null if token is invalid or expired.
     */
    public UserPrincipal validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            return null;
        }

        try {
            String contentToSign = parts[0] + "." + parts[1];
            String expectedSignature = sign(contentToSign);

            // Constant-time signature verification
            if (!MessageDigest.isEqual(
                    parts[2].getBytes(StandardCharsets.UTF_8),
                    expectedSignature.getBytes(StandardCharsets.UTF_8)
            )) {
                log.warn("Invalid token signature detected");
                return null;
            }

            // Decode payload
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

            Long exp = extractLong(payloadJson, "exp");
            long now = Instant.now().getEpochSecond();
            if (exp != null && exp > 0 && now > exp) {
                log.warn("Token expired at {}, current time is {}", exp, now);
                return null;
            }

            Long userId = extractLong(payloadJson, "userId");
            String username = extractString(payloadJson, "username");
            String email = extractString(payloadJson, "email");
            String fullName = extractString(payloadJson, "fullName");
            String role = extractString(payloadJson, "role");

            if (userId == null || username == null) {
                return null;
            }

            return new UserPrincipal(userId, username, email, fullName != null ? fullName : username, role != null ? role : "Financial Operations Lead");
        } catch (Exception e) {
            log.warn("Failed to validate token: {}", e.getMessage());
            return null;
        }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
        mac.init(secretKeySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String extractString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).replace("\\\"", "\"").replace("\\\\", "\\") : null;
    }

    private Long extractLong(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(\\d+)");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? Long.parseLong(matcher.group(1)) : null;
    }

    public long getExpirationSeconds() {
        return DEFAULT_EXPIRATION_SECONDS;
    }
}
