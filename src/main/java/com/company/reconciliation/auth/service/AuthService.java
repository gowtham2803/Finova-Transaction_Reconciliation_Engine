package com.company.reconciliation.auth.service;

import com.company.reconciliation.auth.dto.AuthResponse;
import com.company.reconciliation.auth.dto.LoginRequest;
import com.company.reconciliation.auth.dto.RegisterRequest;
import com.company.reconciliation.auth.dto.UserResponse;
import com.company.reconciliation.security.PasswordService;
import com.company.reconciliation.security.TokenService;
import com.company.reconciliation.user.entity.User;
import com.company.reconciliation.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$");

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository,
                       PasswordService passwordService,
                       TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
    }

    /**
     * Authenticates an enterprise user against credentials stored in the database.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Login request body is missing.");
        }

        String identifier = request.getEffectiveIdentifier();
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email or Username is required.");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }

        final String searchKey = identifier.trim();

        User user = userRepository.findByEmail(searchKey.toLowerCase())
                .or(() -> userRepository.findByUsername(searchKey))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid corporate credentials. Please check your username/email and password."));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account has been deactivated. Please contact your IT administrator.");
        }

        boolean passwordValid = passwordService.verifyPassword(request.getPassword(), user.getPasswordHash());
        if (!passwordValid) {
            log.warn("Failed authentication attempt for user: {}", identifier);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid corporate credentials. Please check your username/email and password.");
        }

        String token = tokenService.generateToken(user);
        log.info("User '{}' (ID: {}) successfully authenticated.", user.getUsername(), user.getId());

        return new AuthResponse(
                token,
                "Bearer",
                tokenService.getExpirationSeconds(),
                UserResponse.fromUser(user)
        );
    }

    /**
     * Registers a new enterprise user and securely hashes their credentials in MySQL.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration request body is missing.");
        }

        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String rawPassword = request.getPassword() != null ? request.getPassword() : "";
        String fullName = request.getFullName() != null ? request.getFullName().trim() : "";
        String role = request.getRole() != null && !request.getRole().trim().isEmpty()
                ? request.getRole().trim()
                : "Financial Operations Lead";

        if (username.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username must be at least 3 characters long.");
        }

        if (email.isEmpty()) {
            email = username.toLowerCase() + "@yescapital.com";
        } else if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please enter a valid corporate email address.");
        }

        if (rawPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long.");
        }

        if (fullName.isEmpty()) {
            fullName = username;
        }

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username '" + username + "' is already taken. Please choose another username.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists with this username or email.");
        }

        String hashedPassword = passwordService.hashPassword(rawPassword);

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setRole(role);
        newUser.setPasswordHash(hashedPassword);
        newUser.setActive(true);

        User savedUser = userRepository.save(newUser);
        log.info("New user registered: '{}' (ID: {}, Email: {})", savedUser.getUsername(), savedUser.getId(), savedUser.getEmail());

        String token = tokenService.generateToken(savedUser);

        return new AuthResponse(
                token,
                "Bearer",
                tokenService.getExpirationSeconds(),
                UserResponse.fromUser(savedUser)
        );
    }

    /**
     * Retrieves currently authenticated user details by user ID.
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No active user session.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found."));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive.");
        }

        return UserResponse.fromUser(user);
    }
}
