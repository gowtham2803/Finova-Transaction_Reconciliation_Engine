package com.company.reconciliation.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuthInterceptor.class);

    private final TokenService tokenService;

    public AuthInterceptor(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Allow CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String requestUri = request.getRequestURI();

        // Always allow public authentication endpoints
        if (requestUri.contains("/api/auth/login") || requestUri.contains("/api/auth/register") || requestUri.contains("/api/v1/health")) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        UserPrincipal principal = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            principal = tokenService.validateToken(token);

            if (principal == null) {
                log.warn("Invalid or expired Bearer token provided for path: {}", requestUri);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired or invalid token. Please sign in again.");
            }
        }

        if (principal != null) {
            UserContext.setCurrentUser(principal);
            request.setAttribute("currentUser", principal);
        } else if (requestUri.contains("/api/auth/me")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required. Please sign in.");
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
