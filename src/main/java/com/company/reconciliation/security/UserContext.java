package com.company.reconciliation.security;

public final class UserContext {

    private static final ThreadLocal<UserPrincipal> CURRENT_USER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void setCurrentUser(UserPrincipal principal) {
        CURRENT_USER.set(principal);
    }

    public static UserPrincipal getCurrentUser() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
    }
}
